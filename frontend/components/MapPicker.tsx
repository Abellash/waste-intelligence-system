"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import L from "leaflet";

type MapPickerProps = {
  selectedPosition: [number, number] | null;
  onSelectLocation: (lat: number, lng: number) => void;
};

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function LocationSelector({
  onSelectLocation,
}: {
  onSelectLocation: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelectLocation(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

export default function MapPicker({
  selectedPosition,
  onSelectLocation,
}: MapPickerProps) {
  const defaultCenter: LatLngExpression = [10.5276, 76.2144];

  return (
    <MapContainer
      center={selectedPosition || defaultCenter}
      zoom={13}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LocationSelector onSelectLocation={onSelectLocation} />

      {selectedPosition && <Marker position={selectedPosition} />}
    </MapContainer>
  );
}