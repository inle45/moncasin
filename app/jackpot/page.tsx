"use client";

import Link from "next/link";
import { ConfettiBurst } from "@/components/boutique/ConfettiBurst";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { Header } from "@/components/layout/Header";
import {
  JackpotBetPanel,
  JackpotPotBar,
  JackpotRollStrip,
  JackpotStatusBanner,
  JackpotWinnerOverlay,
} from "@/components/jackpot";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { useJackpotArena } from "@/hooks/useJackpotArena";
import { formatCoins } from "@/utils/format";
import { cn } from "@/utils/cn";

export default function JackpotPage() {
  const {
    round,
    bets,
    segments,
    balance,
    betAmount,
    setBetAmount,
    myBet,
    winnerBet,
    canBet,
    roundStatus,
    isPlacing,
    placeBet,
    message,
    connected,
    isSyncing,
    countdownSeconds,
    showWinnerFlash,
    winnerPayout,
    isDemoMode,
  } = useJackpotArena();

  const status = round?.status ?? "waiting";
  const winnerProfiles = usePlayerAvatars(
    round?.winner_id ? [round.winner_id] : []
  );
  const winnerProfile = round?.winner_id
    ? winnerProfiles[round.winner_id]
    : null;

  return (
    <div
      className={cn(
        "relative mx-auto min-h-screen max-w-lg pb-10 sm:max-w-2xl",
        "bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.25),transparent_50%),#0B0813]"
      )}
    >
      <Header />
      <DemoBanner />

      <main className="space-y-4 px-4 pt-4">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-fuchsia-300/80">
            PvP temps réel
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">
            Arène du{" "}
            <span className="bg-gradient-to-r from-casino-gold-neon via-fuchsia-300 to-casino-purple-glow bg-clip-text text-transparent">
              Jackpot
            </span>
          </h1>
          <p className="mt-1 text-xs text-white/40">
            Plus ta mise est grosse, plus tu as de tickets · 2% taxe casino
          </p>
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-bold uppercase",
              connected
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-200"
            )}
          >
            {connected ? "Live" : "Sync…"}
          </span>
          <span className="text-white/45">
            Solde {formatCoins(balance)}
            {round?.round_number != null && ` · Manche #${round.round_number}`}
          </span>
        </div>

        {message && (
          <p className="rounded-xl border border-casino-gold/30 bg-casino-gold/10 px-3 py-2 text-center text-sm text-casino-gold-neon">
            {message}
          </p>
        )}

        <JackpotStatusBanner
          status={status}
          countdownSeconds={countdownSeconds}
          playerCount={bets.length}
        />

        <JackpotPotBar totalPot={round?.total_pot ?? 0} segments={segments} />

        <JackpotRollStrip
          active={status === "rolling"}
          bets={bets}
          winnerId={round?.winner_id ?? null}
        />

        {myBet && (
          <p className="text-center text-[11px] text-cyan-200/80">
            Tes tickets : {myBet.ticket_start.toLocaleString("fr-FR")} –{" "}
            {myBet.ticket_end.toLocaleString("fr-FR")} (
            {(
              (myBet.bet_amount / Math.max(1, round?.total_pot ?? 1)) *
              100
            ).toFixed(1)}
            % du pot)
          </p>
        )}

        <JackpotBetPanel
          betAmount={betAmount}
          onBetAmountChange={setBetAmount}
          onPlaceBet={() => void placeBet()}
          canBet={canBet}
          hasBet={!!myBet}
          roundStatus={roundStatus}
          balance={balance}
          isPlacing={isPlacing}
          isDemoMode={isDemoMode}
        />

        {isSyncing && (
          <p className="text-center text-xs text-white/35">Synchronisation…</p>
        )}

        <Link href="/" className="block text-center text-sm text-white/45 hover:text-white">
          ← Retour à l&apos;accueil
        </Link>
      </main>

      <JackpotWinnerOverlay
        active={showWinnerFlash && status === "ended"}
        username={winnerBet?.username ?? winnerProfile?.username ?? "Joueur"}
        payout={winnerPayout}
        avatarUrl={winnerProfile?.avatar_url}
        vipStatus={winnerProfile?.vip_status}
        profileFrame={winnerProfile?.profile_frame}
      />
      <ConfettiBurst active={showWinnerFlash} />
    </div>
  );
}
