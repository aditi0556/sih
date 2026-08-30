# routing_service/route_formatter.py
import requests
from typing import List, Dict
from .config import RoutingConfig

def fetch_osrm_geometry(ordered_stops: List[Dict]) -> Dict:
    if len(ordered_stops) < 2:
        return {"type": "LineString", "coordinates": []}

    coords_str = ";".join([f"{stop['lng']},{stop['lat']}" for stop in ordered_stops])
    url = f"{RoutingConfig.OSRM_ROUTE_URL}{coords_str}?overview=full&geometries=geojson"

    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            return res.json()["routes"][0]["geometry"]
    except Exception as e:
        pass

    return {
        "type": "LineString",
        "coordinates": [[s["lng"], s["lat"]] for s in ordered_stops]
    }

def format_cluster_routes(manager, routing, solution, nodes: List[Dict], cluster_id: str, global_truck_counter: int) -> List[Dict]:
    if not solution:
        return []

    formatted_routes = []

    for vehicle_id in range(manager.GetNumberOfVehicles()):
        index = routing.Start(vehicle_id)
        route_stops = []
        route_load = 0
        seq = 0

        while not routing.IsEnd(index):
            node_idx = manager.IndexToNode(index)
            node_data = nodes[node_idx]
            is_depot = (node_idx == 0)
            is_hotspot = node_data.get("is_hotspot", False)

            # NEW: Removed the photo requirement for hotspots
            action = "START" if is_depot else ("CLEAN_HOTSPOT" if is_hotspot else "COLLECT_WASTE")
            
            node_demand = int(round(node_data.get("demand", node_data.get("fill_pct", node_data.get("predicted_fill_pct", 0)))))

            route_stops.append({
                "seq_number": seq,
                "node_id": node_data.get("id", "DEPOT"),
                "lat": node_data["lat"],
                "lng": node_data["lng"],
                "demand": node_demand,
                "is_hotspot": is_hotspot,
                "action": action
            })
            route_load += node_demand
            seq += 1
            index = solution.Value(routing.NextVar(index))

        depot_idx = manager.IndexToNode(index)
        route_stops.append({
            "seq_number": seq,
            "node_id": nodes[depot_idx].get("id", "DEPOT"),
            "lat": nodes[depot_idx]["lat"],
            "lng": nodes[depot_idx]["lng"],
            "demand": 0,
            "is_hotspot": False,
            "action": "DUMP_AND_END"
        })

        if len(route_stops) > 2:
            geometry = fetch_osrm_geometry(route_stops)
            formatted_routes.append({
                "truck_id": f"TRUCK_{global_truck_counter + len(formatted_routes) + 1}",
                "cluster_id": cluster_id,
                "total_route_load": route_load,
                "stops": route_stops,
                "geometry": geometry
            })

    return formatted_routes