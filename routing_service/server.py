# routing_service/server.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import uvicorn

from clustering import cluster_nodes_by_h3
from distance_matrix import get_distance_matrix
from vrp_solver import solve_cvrp
from route_formatter import format_cluster_routes

app = FastAPI(
    title="Waste Management Routing Service",
    description="Microservice for H3 Clustering and Google OR-Tools CVRP Route Optimization"
)

class NodeModel(BaseModel):
    id: str
    lat: float
    lng: float
    demand: int = Field(default=100, description="100 for standard/hotspot, 200 for upgraded bin")
    is_hotspot: bool = False

class DepotModel(BaseModel):
    id: str = "DEPOT_CENTRAL"
    lat: float
    lng: float
    demand: int = 0
    is_hotspot: bool = False

class OptimizeRoutesRequest(BaseModel):
    depot: DepotModel
    nodes: List[NodeModel]

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "routing_service"}

@app.post("/optimize_routes")
def optimize_routes(payload: OptimizeRoutesRequest) -> Dict[str, Any]:
    depot_dict = payload.depot.model_dump()
    target_nodes = [node.model_dump() for node in payload.nodes]

    if not target_nodes:
        return {
            "status": "success",
            "summary": {"total_trucks_dispatched": 0, "total_waste_collected": 0},
            "routes": []
        }

    # 1. Cluster nodes by H3
    clusters = cluster_nodes_by_h3(depot_dict, target_nodes)

    all_routes = []
    total_waste = 0

    # 2. Optimize each cluster
    for hex_id, cluster_nodes in clusters.items():
        if len(cluster_nodes) <= 1:
            continue

        distance_matrix = get_distance_matrix(cluster_nodes)
        demands = [node.get("demand", 0) for node in cluster_nodes]

        manager, routing, solution = solve_cvrp(distance_matrix, demands)

        if solution:
            cluster_routes = format_cluster_routes(
                manager, routing, solution, cluster_nodes, hex_id, len(all_routes)
            )
            all_routes.extend(cluster_routes)
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

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True)