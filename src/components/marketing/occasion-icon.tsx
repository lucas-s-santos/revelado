import {
  Baby,
  Cake,
  Compass,
  Flame,
  Flower2,
  Gem,
  Heart,
  TreePine,
  type LucideIcon,
} from "lucide-react";

/** Mapa `Occasion.icon` → ícone. Ocasião nova sem ícone cai no coração. */
const ICONS: Record<string, LucideIcon> = {
  heart: Heart,
  cake: Cake,
  flower: Flower2,
  compass: Compass,
  rings: Gem,
  stroller: Baby,
  tree: TreePine,
  candle: Flame,
};

export function OccasionIcon({
  name,
  size = 22,
}: {
  name: string;
  size?: number;
}) {
  const Icon = ICONS[name] ?? Heart;
  return <Icon size={size} strokeWidth={1.5} aria-hidden />;
}
