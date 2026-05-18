-- jackpot_advance_tick() — boucle serveur MonCasin
-- 1) rolling → ended (sans re-payer : trigger_jackpot_roll a déjà crédité profiles.balance)
-- 2) ended → waiting (nouvelle manche après 5 s)
-- Retour front : { "round": { ... }, "server_now": "..." }
--
-- Appliquer : psql "$SUPABASE_DB_URL" -f supabase/jackpot-advance-tick.sql

DROP FUNCTION IF EXISTS public.jackpot_advance_tick();

CREATE OR REPLACE FUNCTION public.jackpot_advance_tick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round public.jackpot_rounds%rowtype;
  v_players int;
  v_tax bigint;
  v_payout bigint;
  v_new_round_id uuid;
  v_round_json jsonb;
BEGIN
  SELECT r.*
  INTO v_round
  FROM public.jackpot_rounds r
  WHERE r.status IN ('rolling', 'ended', 'counting', 'waiting')
     OR (r.status = 'ended' AND r.ended_at > now() - interval '30 seconds')
  ORDER BY
    CASE r.status
      WHEN 'rolling' THEN 0
      WHEN 'ended' THEN 1
      WHEN 'counting' THEN 2
      ELSE 3
    END,
    r.updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.jackpot_rounds (status, round_number, total_pot)
    VALUES (
      'waiting',
      coalesce((SELECT max(round_number) FROM public.jackpot_rounds), 0) + 1,
      0
    )
    RETURNING * INTO v_round;
  END IF;

  SELECT count(DISTINCT user_id)::int
  INTO v_players
  FROM public.jackpot_bets
  WHERE round_id = v_round.id;

  -- Optionnel : waiting + 2 joueurs → counting (si enter_jackpot_arena ne l'a pas fait)
  IF v_round.status = 'waiting' AND v_players >= 2 THEN
    UPDATE public.jackpot_rounds
    SET status = 'counting',
        started_at = coalesce(started_at, now()),
        counting_ends_at = coalesce(counting_ends_at, now() + interval '15 seconds'),
        updated_at = now()
    WHERE id = v_round.id
    RETURNING * INTO v_round;
  END IF;

  -- rolling → ended (animation client ~4 s : seuil 3 s côté serveur)
  IF v_round.status = 'rolling'
     AND v_round.rolling_started_at IS NOT NULL
     AND now() >= v_round.rolling_started_at + interval '3 seconds' THEN

    v_tax := floor(v_round.total_pot * 0.02);
    v_payout := greatest(v_round.total_pot - v_tax, 0);

    -- Ne pas re-créditer : trigger_jackpot_roll a déjà payé le vainqueur
    UPDATE public.jackpot_meta
    SET tax_pool = tax_pool + v_tax,
        updated_at = now()
    WHERE id = 1;

    UPDATE public.jackpot_rounds
    SET status = 'ended',
        tax_pool = v_tax,
        winner_payout = coalesce(winner_payout, v_payout),
        ended_at = coalesce(ended_at, now()),
        updated_at = now()
    WHERE id = v_round.id
    RETURNING * INTO v_round;
  END IF;

  -- ended → nouvelle manche waiting
  IF v_round.status = 'ended'
     AND v_round.ended_at IS NOT NULL
     AND now() >= v_round.ended_at + interval '5 seconds' THEN

    INSERT INTO public.jackpot_rounds (status, round_number, total_pot, tax_pool)
    VALUES (
      'waiting',
      coalesce((SELECT max(round_number) FROM public.jackpot_rounds), 0) + 1,
      0,
      0
    )
    RETURNING id INTO v_new_round_id;

    SELECT * INTO v_round
    FROM public.jackpot_rounds
    WHERE id = v_new_round_id;
  END IF;

  v_round_json := jsonb_build_object(
    'id', v_round.id,
    'round_number', v_round.round_number,
    'status', v_round.status,
    'total_pot', v_round.total_pot,
    'tax_pool', v_round.tax_pool,
    'winner_id', v_round.winner_id,
    'winner_payout', v_round.winner_payout,
    'winning_ticket', v_round.winning_ticket,
    'started_at', v_round.started_at,
    'counting_ends_at', v_round.counting_ends_at,
    'rolling_started_at', v_round.rolling_started_at,
    'ended_at', v_round.ended_at,
    'created_at', v_round.created_at,
    'updated_at', v_round.updated_at
  );

  RETURN jsonb_build_object(
    'round', v_round_json,
    'server_now', to_jsonb(now())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.jackpot_advance_tick() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jackpot_advance_tick() TO anon;
