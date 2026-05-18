-- Appliquer hors dashboard Supabase (SQL Editor buggé) :
--   psql "$SUPABASE_DB_URL" -f supabase/trigger-jackpot-roll.sql
-- ou : npx supabase db execute --file supabase/trigger-jackpot-roll.sql (projet lié)

DROP FUNCTION IF EXISTS public.trigger_jackpot_roll(uuid);

CREATE OR REPLACE FUNCTION public.trigger_jackpot_roll(p_round_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round_status text;
  v_pot_total numeric;
  v_tax_pool_amount numeric;
  v_ticket_gagnant numeric;
  v_winner_uuid uuid;
  v_payout_final bigint;
  v_json_retour jsonb;
BEGIN
  SELECT status, total_pot, tax_pool
  INTO v_round_status, v_pot_total, v_tax_pool_amount
  FROM public.jackpot_rounds
  WHERE id = p_round_id
  FOR UPDATE;

  IF v_round_status = 'rolling' THEN
    SELECT jsonb_build_object(
      'id', id,
      'status', status,
      'winner_id', winner_id,
      'winning_ticket', winning_ticket,
      'rolling_started_at', rolling_started_at,
      'total_pot', total_pot
    )
    INTO v_json_retour
    FROM public.jackpot_rounds
    WHERE id = p_round_id;

    RETURN jsonb_build_object('ok', true, 'round', v_json_retour);
  END IF;

  IF v_round_status != 'counting' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'message', 'Statut invalide : ' || coalesce(v_round_status, 'null')
    );
  END IF;

  IF (
    SELECT count(DISTINCT user_id)
    FROM public.jackpot_bets
    WHERE round_id = p_round_id
  ) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Moins de 2 joueurs uniques');
  END IF;

  v_ticket_gagnant := floor(random() * v_pot_total);

  SELECT user_id INTO v_winner_uuid
  FROM public.jackpot_bets
  WHERE round_id = p_round_id
    AND v_ticket_gagnant BETWEEN ticket_start AND ticket_end
  LIMIT 1;

  v_payout_final := floor(v_pot_total - v_tax_pool_amount);

  IF v_winner_uuid IS NOT NULL THEN
    UPDATE public.profiles
    SET balance = balance + v_payout_final
    WHERE id = v_winner_uuid;
  END IF;

  UPDATE public.jackpot_rounds
  SET status = 'rolling',
      winning_ticket = v_ticket_gagnant,
      winner_id = v_winner_uuid,
      rolling_started_at = clock_timestamp()
  WHERE id = p_round_id
  RETURNING jsonb_build_object(
    'id', id,
    'status', status,
    'total_pot', total_pot,
    'winner_id', winner_id,
    'winning_ticket', winning_ticket,
    'rolling_started_at', rolling_started_at
  )
  INTO v_json_retour;

  RETURN jsonb_build_object('ok', true, 'round', v_json_retour);
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_jackpot_roll(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_jackpot_roll(uuid) TO anon;
