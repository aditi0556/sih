import requests
from typing import List, Dict
from config import RoutingConfig

def get_distance_matrix(nodes: List[Dict]) -> List[List[int]]:
    """
    Calls OSRM Table API for real road distances (meters) between all nodes in a cluster.
    """
    coords_str = ";".join([f"{node['lng']},{node['lat']}" for node in nodes])
    url = f"{RoutingConfig.OSRM_TABLE_URL}{coords_str}?annotations=distance"

    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            raw_distances = data.get("distances", [])
            return [[int(round(dist)) if dist is not None else 999999 for dist in row] for row in raw_distances]
        else:
            raise Exception(f"OSRM Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[Warning] OSRM call failed: {e}. Falling back to straight-line distance approximation.")
        n = len(nodes)
        fallback_matrix = [[0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if i != j:
                    d_lat = (nodes[i]['lat'] - nodes[j]['lat']) * 111000
                    d_lng = (nodes[i]['lng'] - nodes[j]['lng']) * 111000
                    fallback_matrix[i][j] = int((d_lat**2 + d_lng**2)**0.5)
        return fallback_matrix