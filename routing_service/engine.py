# routing_service/engine.py
from typing import List, Dict, Any
from .clustering import cluster_nodes_by_h3
from .distance_matrix import get_distance_matrix
from .vrp_solver import solve_cvrp
from .route_formatter import format_cluster_routes

def generate_optimized_routes(depot: Dict[str, Any], predictions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Master function to be imported and called by the main backend.
    
    :param depot: Dictionary containing depot coordinates e.g., {'id': 'DEPOT', 'lat': 12.9, 'lng': 77.5}
    :param predictions: List of dictionaries representing rows from the XGBoost prediction table 
                        and active hotspots.
    :return: A dictionary containing the summary and structured routes ready for DB insertion.
    """
    if not predictions:
        return {
            "status": "success",
            "summary": {"total_trucks_dispatched": 0, "total_waste_collected": 0},
            "routes": []
        }

    # 1. Cluster nodes by H3. 
    # clustering.py automatically looks for 'predicted_fill_pct' or 'fill_pct' keys
    clusters = cluster_nodes_by_h3(depot, predictions)

    all_routes = []
    total_waste = 0
    global_truck_counter = 0

    # 2. Optimize each H3 hex cluster
    for hex_id, cluster_nodes in clusters.items():
        if len(cluster_nodes) <= 1:
            continue

        # Generate distance matrix via OSRM
        distance_matrix = get_distance_matrix(cluster_nodes)
        
        # Extract demands as integers using the fallback logic in clustering.py
        demands = [int(node.get('predicted_fill_pct', node.get('fill_pct', node.get('demand', 0)))) for node in cluster_nodes]

        # Solve VRP with OR-Tools
        manager, routing, solution = solve_cvrp(distance_matrix, demands)

        if solution:
            # Format the output into structured stops and GeoJSON
            cluster_routes = format_cluster_routes(
                manager, routing, solution, cluster_nodes, hex_id, global_truck_counter
            )
            all_routes.extend(cluster_routes)
            global_truck_counter += len(cluster_routes)
            total_waste += sum(r["total_route_load"] for r in cluster_routes)

    return {
        "status": "success",
        "summary": {
            "total_trucks_dispatched": len(all_routes),
            "total_waste_collected_units": total_waste,
            "clusters_processed": len(clusters)
        },
        "routes": all_routes
    }