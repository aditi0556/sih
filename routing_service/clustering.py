# routing_service/clustering.py
import h3
from typing import List, Dict
from config import RoutingConfig

def cluster_nodes_by_h3(depot: Dict, target_nodes: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Groups target bins and hotspots into H3 hexagonal clusters.
    Ensures the depot is always present as index 0 in each cluster.
    """
    clusters: Dict[str, List[Dict]] = {}

    for node in target_nodes:
        # Compatible with h3-py v3 (geo_to_h3) and v4 (latlng_to_cell)
        if hasattr(h3, 'latlng_to_cell'):
            hex_id = h3.latlng_to_cell(node['lat'], node['lng'], RoutingConfig.H3_RESOLUTION)
        else:
            hex_id = h3.geo_to_h3(node['lat'], node['lng'], RoutingConfig.H3_RESOLUTION)

        if hex_id not in clusters:
            clusters[hex_id] = [depot]

        clusters[hex_id].append(node)

    return clusters