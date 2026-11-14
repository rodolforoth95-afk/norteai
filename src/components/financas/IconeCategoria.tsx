import {
  Bike,
  Briefcase,
  Car,
  CircleEllipsis,
  CreditCard,
  Dumbbell,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  Home,
  PartyPopper,
  PawPrint,
  Plane,
  Plus,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  TrendingUp,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const ICONES: Record<string, LucideIcon> = {
  Home,
  Zap,
  ShoppingCart,
  UtensilsCrossed,
  Bike,
  Car,
  HeartPulse,
  GraduationCap,
  PartyPopper,
  ShoppingBag,
  Repeat,
  Sparkles,
  CreditCard,
  CircleEllipsis,
  Briefcase,
  HandCoins,
  TrendingUp,
  Plus,
  Tag,
  Plane,
  PawPrint,
  Gift,
  Dumbbell,
};

export const ICONES_ESCOLHA = [
  "Tag",
  "Plane",
  "PawPrint",
  "Gift",
  "Dumbbell",
  "Home",
  "Car",
  "ShoppingBag",
  "UtensilsCrossed",
  "HeartPulse",
  "GraduationCap",
  "Sparkles",
  "Briefcase",
  "HandCoins",
];

// Ícone da categoria num quadrado com a cor dela (fundo translúcido).
export function IconeCategoria({
  icone,
  cor,
  tamanho = 36,
}: {
  icone: string;
  cor: string;
  tamanho?: number;
}) {
  const Icone = ICONES[icone] ?? Tag;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl"
      style={{
        width: tamanho,
        height: tamanho,
        background: `${cor}22`,
        color: cor,
      }}
      aria-hidden="true"
    >
      <Icone
        style={{ width: tamanho * 0.5, height: tamanho * 0.5 }}
        strokeWidth={2}
      />
    </span>
  );
}
