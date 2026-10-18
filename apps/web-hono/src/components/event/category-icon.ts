import type { EventCategory } from "@emergency-map/domain/constants";
import {
  CloudRain,
  Car,
  Droplets,
  Flame,
  Mountain,
  Snowflake,
  CircleAlert,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<EventCategory, LucideIcon> = {
  fire: Flame,
  flood: Droplets,
  landslide: Mountain,
  road_incident: Car,
  heavy_rain: CloudRain,
  frost: Snowflake,
  other: CircleAlert,
};
