from collections import defaultdict
from sklearn.cluster import DBSCAN
import numpy as np


def calculate_hotspot_level(report_count: int, average_priority: float) -> str:
    if report_count >= 5 and average_priority >= 6:
        return "critical"
    if report_count >= 4 and average_priority >= 4:
        return "high"
    if report_count >= 3 and average_priority >= 2:
        return "medium"
    return "low"


def cluster_reports(reports: list[dict], eps: float = 0.0015, min_samples: int = 2):
    """
    eps is in degrees.
    ~0.0015 degrees is roughly around 150–170 meters depending on location.
    """

    if not reports:
        return []

    coordinates = np.array([[r["latitude"], r["longitude"]] for r in reports])

    clustering = DBSCAN(eps=eps, min_samples=min_samples)
    labels = clustering.fit_predict(coordinates)

    clusters = defaultdict(list)

    for report, label in zip(reports, labels):
        if label == -1:
            # -1 means noise, not part of a hotspot
            continue
        clusters[int(label)].append(report)

    hotspot_results = []

    for cluster_label, cluster_reports in clusters.items():
        center_lat = sum(r["latitude"] for r in cluster_reports) / len(cluster_reports)
        center_lng = sum(r["longitude"] for r in cluster_reports) / len(cluster_reports)

        priorities = [
            r["priority_score"] if r.get("priority_score") is not None else 0
            for r in cluster_reports
        ]
        average_priority = sum(priorities) / len(priorities) if priorities else 0

        hotspot_id = f"hotspot-{cluster_label}"

        hotspot_results.append({
            "hotspot_id": hotspot_id,
            "center_lat": center_lat,
            "center_lng": center_lng,
            "report_count": len(cluster_reports),
            "average_priority": round(average_priority, 2),
            "hotspot_level": calculate_hotspot_level(len(cluster_reports), average_priority),
            "reports": cluster_reports,
        })

    return hotspot_results