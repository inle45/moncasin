import { cn } from "@/utils/cn";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-white/10", className)} />;
}

export function LeaderboardSkeleton() {
  return (
    <div className="px-4 pb-8" aria-hidden>
      {/* Podium skeleton */}
      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="flex items-end justify-center gap-2">
          <Bone className="h-28 flex-1 rounded-t-2xl" />
          <Bone className="h-36 flex-1 rounded-t-2xl" />
          <Bone className="h-24 flex-1 rounded-t-2xl" />
        </div>
      </div>

      {/* List skeleton */}
      <div className="mt-6 space-y-2">
        <Bone className="mb-3 h-3 w-32" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Bone key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
