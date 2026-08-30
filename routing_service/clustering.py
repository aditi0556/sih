# routing_service/clustering.py
"""
H3 Geospatial Clustering & Data Enrichment Engine
Smart Waste Management System (SIH Project)
"""

import h3
import pandas as pd
from typing import List, Dict, Any, Optional

try:
    from .config import RoutingConfig
except ImportError:
    from config import RoutingConfig




def _get_lat_lng(node: Dict[str, Any]) -> tuple:
    """Helper to extract lat/lng regardless of key naming (lat/latitude, lng/longitude)."""
    lat = node.get('lat', node.get('latitude', 0.0))
    lng = node.get('lng', node.get('longitude', 0.0))
    return float(lat), float(lng)


def _get_fill_pct(node: Dict[str, Any]) -> float:
    """Helper to extract fill percentage / demand."""
    return float(node.get('fill_pct', node.get('predicted_fill_pct', node.get('fill_percentage', node.get('demand', 100.0)))))


def get_h3_cell(lat: float, lng: float, resolution: int = RoutingConfig.H3_RESOLUTION) -> str:
    """Compatible with h3-py v3 (geo_to_h3) and v4 (latlng_to_cell)."""
    if hasattr(h3, 'latlng_to_cell'):
        return h3.latlng_to_cell(lat, lng, resolution)
    return h3.geo_to_h3(lat, lng, resolution)


def enrich_nodes_with_h3(nodes: List[Dict[str, Any]], resolution: int = RoutingConfig.H3_RESOLUTION) -> List[Dict[str, Any]]:
    """
    Spatially enriches node records by attaching 'h3_cell' and 'h3_ward_zone'.
    Preserves all original fields (lat, lng, fill_pct, node_id).
    """
    enriched = []
    for node in nodes:
        lat, lng = _get_lat_lng(node)
        fill_pct = _get_fill_pct(node)
        
        cell_id = get_h3_cell(lat, lng, resolution)
        ward_id = get_h3_cell(lat, lng, max(0, resolution - 1))
        
        enriched_node = {
            **node,
            "lat": lat,
            "lng": lng,
            "fill_pct": fill_pct,
            "h3_cell": cell_id,
            "h3_ward_zone": ward_id
        }
        enriched.append(enriched_node)
    return enriched


def cluster_nodes_by_h3(
    depot: Dict[str, Any],
    target_nodes: List[Dict[str, Any]],
    critical_threshold: float = 90.0,
    proactive_threshold: float = 80.0,
    resolution: int = RoutingConfig.H3_RESOLUTION
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Groups target bins and hotspots into H3 hexagonal clusters.
    Ensures the depot is always present as index 0 in each cluster.
    
    Filters bins based on:
    1. Critical Threshold (>= 90% fill percentage).
    2. K-Ring Proactive Sweep (>= 80% fill in adjacent hexes of critical bins).
    """
    if not target_nodes:
        return {}

    # Step 1: Enrich all nodes with H3 cell IDs
    enriched_nodes = enrich_nodes_with_h3(target_nodes, resolution=resolution)

    # Step 2: Separate Critical (>= 90%) and Non-Critical Bins
    critical_nodes = [n for n in enriched_nodes if n['fill_pct'] >= critical_threshold]
    non_critical_nodes = [n for n in enriched_nodes if n['fill_pct'] < critical_threshold]

    # Step 3: K-Ring Proactive Neighbor Sweep
    critical_hex_set = {n['h3_cell'] for n in critical_nodes}
    proactive_hex_set = set()
    for hex_id in critical_hex_set:
        neighbors = h3.grid_disk(hex_id, 1) if hasattr(h3, 'grid_disk') else h3.k_ring(hex_id, 1)
        proactive_hex_set.update(neighbors)

    proactive_nodes = [
        {**n, "is_proactive": True}
        for n in non_critical_nodes
        if n['h3_cell'] in proactive_hex_set and n['fill_pct'] >= proactive_threshold
    ]

    final_nodes_to_visit = critical_nodes + proactive_nodes

    if not final_nodes_to_visit and enriched_nodes:
        # Fallback: Sort by fill percentage descending and select nodes >= 50% (or top nodes)
        sorted_nodes = sorted(enriched_nodes, key=lambda x: x['fill_pct'], reverse=True)
        final_nodes_to_visit = [n for n in sorted_nodes if n['fill_pct'] >= 50.0] or sorted_nodes[:max(1, len(sorted_nodes) // 2)]

    # Step 4: Group nodes into H3 clusters (Depot is index 0 in each cluster)
    clusters: Dict[str, List[Dict[str, Any]]] = {}
    for node in final_nodes_to_visit:
        hex_id = node['h3_cell']
        if hex_id not in clusters:
            clusters[hex_id] = [depot]  # Depot always index 0
        clusters[hex_id].append(node)

    return clusters


def get_cluster_centroids(clusters: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    """
    Calculates centroid lat/lng and aggregate demand volume for each H3 cluster.
    Ready for OR-Tools Distance Matrix routing.
    """
    centroid_nodes = []
    for hex_id, nodes in clusters.items():
        # Exclude depot (index 0) when computing bin centroid
        bin_nodes = [n for n in nodes if n != nodes[0] or len(nodes) == 1]
        if not bin_nodes:
            continue

        lats = [n['lat'] for n in bin_nodes]
        lngs = [n['lng'] for n in bin_nodes]
        demands = [n['fill_pct'] for n in bin_nodes]

        centroid_nodes.append({
            "h3_cell": hex_id,
            "centroid_lat": sum(lats) / len(lats),
            "centroid_lng": sum(lngs) / len(lngs),
            "bin_count": len(bin_nodes),
            "total_volume_demand": sum(demands),
            "nodes": bin_nodes
        })

    return centroid_nodes


def generate_h3_geojson(clusters: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
    """
    Generates GeoJSON FeatureCollection of H3 Hexagon boundaries
    for Mapbox / Leaflet frontend dashboard maps.
    """
    features = []
    for hex_id, nodes in clusters.items():
        # Get hexagon boundary vertices
        if hasattr(h3, 'cell_to_boundary'):
            boundary = h3.cell_to_boundary(hex_id)
        else:
            boundary = h3.h3_to_geo_boundary(hex_id)

        # Convert to GeoJSON [lng, lat] format
        coords = [[lng, lat] for lat, lng in boundary]
        coords.append(coords[0])  # Close polygon

        bin_nodes = nodes[1:] if len(nodes) > 1 else []

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords]
            },
            "properties": {
                "h3_cell": hex_id,
                "bin_count": len(bin_nodes),
                "total_demand": sum(n.get('fill_pct', 0) for n in bin_nodes)
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }