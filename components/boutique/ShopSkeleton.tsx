import { cn } from "@/utils/cn";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-white/10", className)} />;
}

export function ShopSkeleton() {
  return (
    <div className="space-y-4 px-4 pb-8" aria-hidden>
      <Bone className="h-10 w-full" />
      <Bone className="h-48 w-full" />
      <Bone className="h-48 w-full" />
      <div className="grid grid-cols-2 gap-3">
        <Bone className="h-40" />
        <Bone className="h-40" />
        <Bone className="h-40" />
        <Bone className="h-40" />
      </div>
    </div>
  );
}
