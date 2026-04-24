"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

type Report = {
  id: string;
  latitude: number;
  longitude: number;
  user_comment?: string;
  severity_label?: string | null;
  priority_score?: number | null;
};

function createColoredMarker(color: string) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

const greenMarker = createColoredMarker("green");
const yellowMarker = createColoredMarker("yellow");
const orangeMarker = createColoredMarker("orange");
const redMarker = createColoredMarker("red");
const blueMarker = createColoredMarker("blue");

function getMarkerIcon(priorityScore?: number | null) {
  if (priorityScore === null || priorityScore === undefined) return blueMarker;
  if (priorityScore <= 2) return greenMarker;
  if (priorityScore <= 4) return yellowMarker;
  if (priorityScore <= 6) return orangeMarker;
  return redMarker;
}

function getPriorityLabel(priorityScore?: number | null) {
  if (priorityScore === null || priorityScore === undefined) return "Not calculated yet";
  if (priorityScore <= 2) return "Low";
  if (priorityScore <= 4) return "Medium";
  if (priorityScore <= 6) return "High";
  return "Critical";
}

export default function MapView({ reports }: { reports: Report[] }) {
  return (
    <MapContainer
      center={[10.5276, 76.2144]}
      zoom={13}
      style={{ height: "400px", width: "100%", marginBottom: "24px" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={getMarkerIcon(report.priority_score)}
        >
          <Popup>
            <strong>Report</strong>
            <br />
            {report.user_comment || "No comment"}
            <br />
            Severity: {report.severity_label || "Not analyzed yet"}
            <br />
            Priority Score: {report.priority_score ?? "Not calculated yet"}
            <br />
            Priority Level: {getPriorityLabel(report.priority_score)}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}