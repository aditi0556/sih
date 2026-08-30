"""
H3 Geospatial Clustering & Data Enrichment Engine
Smart Waste Management System (SIH Project)

This module handles:
1. Converting raw ML dustbin predictions (lat, lng, fill_pct) to H3 Hexagonal Grid Cells (Res 9).
2. Filtering critical bins based on the 90% threshold rule.
3. Performing Proactive K-Ring Neighbor Sweeps (for bins >= 80% in adjacent hexes).
4. Aggregating bins into H3 Hexagon Cluster Centroids for Google OR-Tools.
5. Exporting GeoJSON polygon features for Mapbox / Leaflet frontend dashboards.
"""

import h3
import pandas as pd
from typing import List, Dict, Any

try:
    from config import RoutingConfig
    DEFAULT_RESOLUTION = RoutingConfig.H3_RESOLUTION
except ImportError:
    DEFAULT_RESOLUTION = 8


class H3ClusterEngine:
    """
    Geospatial Clustering Engine using Uber H3 Discrete Global Grid System.
    """
    def __init__(
        self,
        resolution: int = DEFAULT_RESOLUTION,
        critical_threshold: float = 90.0,
        proactive_threshold: float = 80.0
    ):
        """
        :param resolution: H3 resolution (Default from RoutingConfig: 8)
        :param critical_threshold: Fill percentage threshold for mandatory pickup (Default: 90.0%)
        :param proactive_threshold: Fill percentage threshold for K-Ring adjacent hex pickup (Default: 80.0%)
        """
        self.resolution = resolution
        self.critical_threshold = critical_threshold
        self.proactive_threshold = proactive_threshold

    def assign_h3_cells(self, bins_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Attaches 'h3_cell' and 'h3_ward_zone' to each raw bin record without modifying original data.
        """
        enriched_bins = []
        for b in bins_list:
            lat = b['latitude']
            lng = b['longitude']
            fill_pct = b.get('predicted_fill_pct', b.get('fill_percentage', 0.0))

            # H3 v4 API calls
            cell = h3.latlng_to_cell(lat, lng, self.resolution)
            ward = h3.latlng_to_cell(lat, lng, max(0, self.resolution - 1))

            enriched_item = {
                **b,
                "predicted_fill_pct": fill_pct,
                "h3_cell": cell,
                "h3_ward_zone": ward
            }
            enriched_bins.append(enriched_item)
        return enriched_bins

    def process_and_cluster(self, bins_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Main pipeline:
        - Assigns H3 cells to all bins.
        - Identifies critical bins (>= 90%).
        - Performs K-Ring neighbor check for proactive bins (>= 80%).
        - Groups critical & proactive bins into H3 Hex Cluster Centroids for OR-Tools.
        - Formats summary and GeoJSON.
        """
        if not bins_list:
            return {
                "or_tools_input_bins": [],
                "or_tools_h3_clusters": [],
                "geojson": {"type": "FeatureCollection", "features": []},
                "summary": {"total_bins": 0, "critical_bins": 0, "proactive_bins": 0, "total_clusters": 0}
            }

        # Step 1: Assign H3 Cells
        enriched_bins = self.assign_h3_cells(bins_list)

        # Step 2: Separate Critical (>= 90%) and Non-Critical Bins
        critical_bins = [b for b in enriched_bins if b['predicted_fill_pct'] >= self.critical_threshold]
        non_critical_bins = [b for b in enriched_bins if b['predicted_fill_pct'] < self.critical_threshold]

        # Step 3: K-Ring Neighbor Proactive Sweep
        # Find 1-ring neighbors of all critical H3 cells
        critical_hex_set = {b['h3_cell'] for b in critical_bins}
        proactive_hex_set = set()
        for hex_id in critical_hex_set:
            # Get surrounding 6 adjacent hexes (disk of radius 1)
            neighbors = h3.grid_disk(hex_id, 1)
            proactive_hex_set.update(neighbors)

        # Include non-critical bins if they are inside a neighbor hex AND >= proactive_threshold (80%)
        proactive_bins = []
        skipped_bins = []

        for b in non_critical_bins:
            if b['h3_cell'] in proactive_hex_set and b['predicted_fill_pct'] >= self.proactive_threshold:
                b['is_proactive_pickup'] = True
                proactive_bins.append(b)
            else:
                skipped_bins.append(b)

        # Final Bins to visit by OR-Tools
        final_bins_to_visit = critical_bins + proactive_bins

        # Step 4: Cluster into H3 Hexagon Centroids
        h3_clusters = self._generate_clusters(final_bins_to_visit)

        # Step 5: Generate GeoJSON for Frontend Rendering
        geojson_data = self.generate_geojson(h3_clusters)

        return {
            "or_tools_input_bins": final_bins_to_visit,
            "or_tools_h3_clusters": h3_clusters,
            "geojson": geojson_data,
            "summary": {
                "total_bins_evaluated": len(bins_list),
                "critical_bins_to_visit": len(critical_bins),
                "proactive_bins_to_visit": len(proactive_bins),
                "total_bins_to_visit": len(final_bins_to_visit),
                "bins_skipped": len(skipped_bins),
                "total_h3_clusters": len(h3_clusters)
            }
        }

    def _generate_clusters(self, bins_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Groups list of bins by H3 cell into centroid nodes for OR-Tools."""
        if not bins_list:
            return []

        df = pd.DataFrame(bins_list)
        clusters = []

        grouped = df.groupby('h3_cell')
        for cell_id, group in grouped:
            centroid_lat = group['latitude'].mean()
            centroid_lng = group['longitude'].mean()
            total_demand = group['predicted_fill_pct'].sum()

            clusters.append({
                "h3_cell": cell_id,
                "h3_ward_zone": group['h3_ward_zone'].iloc[0],
                "centroid_lat": float(centroid_lat),
                "centroid_lng": float(centroid_lng),
                "bin_count": len(group),
                "total_volume_demand": float(total_demand),
                "bin_ids": group.get('bin_id', pd.Series(range(len(group)))).tolist()
            })

        return clusters

    def generate_geojson(self, clusters: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Exports GeoJSON feature collection of H3 Hexagon boundaries
        for Mapbox / Leaflet dashboard visualization.
        """
        features = []
        for cluster in clusters:
            cell_id = cluster['h3_cell']
            # Get vertices (lat, lng) of hexagon
            boundary = h3.cell_to_boundary(cell_id)
            # GeoJSON expects coordinates as [longitude, latitude]
            coords = [[lng, lat] for lat, lng in boundary]
            coords.append(coords[0])  # Close polygon loop

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coords]
                },
                "properties": {
                    "h3_cell": cell_id,
                    "h3_ward_zone": cluster['h3_ward_zone'],
                    "centroid_lat": cluster['centroid_lat'],
                    "centroid_lng": cluster['centroid_lng'],
                    "bin_count": cluster['bin_count'],
                    "total_volume_demand": cluster['total_volume_demand'],
                    "bin_ids": cluster['bin_ids']
                }
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }


# Convenience Function for quick 1-line integration
def enrich_and_cluster_bins(
    bins_data: List[Dict[str, Any]],
    resolution: int = 9,
    critical_threshold: float = 90.0,
    proactive_threshold: float = 80.0
) -> Dict[str, Any]:
    """One-line helper function for OR-Tools developer."""
    engine = H3ClusterEngine(
        resolution=resolution,
        critical_threshold=critical_threshold,
        proactive_threshold=proactive_threshold
    )
    return engine.process_and_cluster(bins_data)
