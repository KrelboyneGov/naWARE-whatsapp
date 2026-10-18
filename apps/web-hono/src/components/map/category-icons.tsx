import {
  CircleHelp,
  CloudRain,
  Car,
  Droplets,
  Flame,
  Mountain,
  Snowflake,
  type LucideIcon,
} from "lucide-react";
import type { EventCategory } from "@emergency-map/domain/constants";

export const CATEGORY_ICONS: Record<EventCategory, LucideIcon> = {
  fire: Flame,
  flood: Droplets,
  landslide: Mountain,
  road_incident: Car,
  heavy_rain: CloudRain,
  frost: Snowflake,
  other: CircleHelp,
};
