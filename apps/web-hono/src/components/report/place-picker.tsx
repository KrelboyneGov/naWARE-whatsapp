/** Small client-only map where the reporter drops a point. Loaded lazily by the form. */
import { useEffect } from "react";
import {
  Map as MapCanvas,
  MapControls,
  MapMarker,
  MarkerContent,
  useMap,
} from "@/components/ui/map";
import { MapPin } from "lucide-react";
import { PERU_BOUNDS } from "@emergency-map/domain/constants";

function ClickCatcher({
  onPick,
  center,
}: {
  onPick: (p: { lat: number; lng: number }) => void;
  center: { lat: number; lng: number } | null;
}) {
  const { map } = useMap();
  useEffect(() => {
    if (!map) return;
    const handler = (e: { lngLat: { lat: number; lng: number } }) =>
      onPick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    map.on("click", handler);
    map.getCanvas().style.cursor = "crosshair";
    return () => {
      map.off("click", handler);
    };
  }, [map, onPick]);
  useEffect(() => {
    if (map && center) map.flyTo({ center: [center.lng, center.lat], zoom: 11, duration: 600 });
  }, [map, center?.lat, center?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function PlacePicker({
  point,
  center,
  onPick,
}: {
  point: { lat: number; lng: number } | null;
  center: { lat: number; lng: number } | null;
  onPick: (p: { lat: number; lng: number }) => void;
}) {
  return (
    <MapCanvas
      theme="light"
      bounds={PERU_BOUNDS as unknown as [number, number, number, number]}
      fitBoundsOptions={{ padding: 16 }}
      className="h-full w-full"
    >
      <ClickCatcher onPick={onPick} center={point ?? center} />
      <MapControls position="bottom-right" showZoom />
      {point && (
        <MapMarker
          longitude={point.lng}
          latitude={point.lat}
          draggable
          onDragEnd={(l) => onPick({ lat: l.lat, lng: l.lng })}
        >
          <MarkerContent>
            <MapPin className="text-primary size-8 drop-shadow" aria-label="Punto elegido" />
          </MarkerContent>
        </MapMarker>
      )}
    </MapCanvas>
  );
}
