-- complete_jackpot_round(p_round_id) — clôture immédiate après l'animation (rolling → ended)
-- Sans double paiement si trigger_jackpot_roll a déjà crédité le vainqueur.

DROP FUNCTION IF EXISTS public.complete_jackpot_round(uuid);

CREATE OR REPLACE FUNCTION public.complete_jackpot_round(p_round_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round public.jackpot_rounds%rowtype;
  v_tax bigint;
  v_payout bigint;
  v_round_json jsonb;
BEGIN
  SELECT * INTO v_round
  FROM public.jackpot_rounds
  WHERE id = p_round_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Manche introuvable');
  END IF;

  IF v_round.status = 'ended' THEN
    v_round_json := to_jsonb(v_round);
    RETURN jsonb_build_object('ok', true, 'round', v_round_json);
  END IF;

  IF v_round.status = 'waiting' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'message', 'Manche encore en attente (statut waiting)'
    );
  END IF;

  IF v_round.status NOT IN ('rolling', 'counting') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'message', 'Statut invalide pour clôture : ' || v_round.status
    );
  END IF;

  v_tax := floor(v_round.total_pot * 0.02);
  v_payout := greatest(v_round.total_pot - v_tax, 0);

  UPDATE public.jackpot_meta
  SET tax_pool = tax_pool + v_tax,
      updated_at = now()
  WHERE id = 1;

  UPDATE public.jackpot_rounds
  SET status = 'ended',
      tax_pool = v_tax,
      winner_payout = coalesce(winner_payout, v_payout),
      ended_at = now(),
      updated_at = now()
  WHERE id = p_round_id
  RETURNING * INTO v_round;

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

  RETURN jsonb_build_object('ok', true, 'round', v_round_json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_jackpot_round(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_jackpot_round(uuid) TO anon;
