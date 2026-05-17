import { cn } from "@/utils/cn";

interface VipBadgeProps {
  status: string;
  className?: string;
}

const VIP_STYLES: Record<string, string> = {
  VIP: "border-casino-gold-neon/50 bg-casino-gold/15 text-casino-gold-neon",
  Gold: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  Joueur: "border-white/15 bg-white/5 text-white/50",
};

export function VipBadge({ status, className }: VipBadgeProps) {
  const style =
    VIP_STYLES[status] ??
    "border-casino-purple-neon/40 bg-casino-purple/15 text-casino-purple-glow";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        style,
        className
      )}
    >
      {status}
    </span>
  );
}
