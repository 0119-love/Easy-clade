import { queryOne } from "./db";

/**
 * The one query in this codebase that's deliberately NOT scoped to a single
 * user -- every other file under lib/history takes a userId and answers
 * "what did this one account do." This answers the founder's own question
 * from Project Leap: of everyone who's signed up, how many strangers (not
 * the operator's own test account) actually got value out of the product.
 * Never expose this to a non-owner request -- see lib/auth/owner.ts.
 */
export interface FounderFunnelStats {
  signups: number;
  ranAnything: number;
  completedCommittee: number;
  returned: number;
}

export async function getFounderFunnelStats(ownerUserId: number): Promise<FounderFunnelStats> {
  const signups = await queryOne<{ n: string }>(`SELECT count(*) AS n FROM users WHERE id != ?`, [ownerUserId]);

  const ranAnything = await queryOne<{ n: string }>(
    `SELECT count(DISTINCT user_id) AS n FROM runs WHERE user_id != ?`,
    [ownerUserId],
  );

  const completedCommittee = await queryOne<{ n: string }>(
    `SELECT count(DISTINCT user_id) AS n FROM committee_runs WHERE user_id != ? AND status = 'success'`,
    [ownerUserId],
  );

  // "Returned" = came back on a different calendar day, not just a burst of
  // clicks in one sitting -- combines both regular runs and Committee runs
  // since either counts as a real second visit.
  const returned = await queryOne<{ n: string }>(
    `WITH activity AS (
       SELECT user_id, started_at::date AS d FROM runs WHERE user_id != ?
       UNION
       SELECT user_id, started_at::date AS d FROM committee_runs WHERE user_id != ?
     )
     SELECT count(*) AS n FROM (
       SELECT user_id FROM activity GROUP BY user_id HAVING count(DISTINCT d) >= 2
     ) t`,
    [ownerUserId, ownerUserId],
  );

  return {
    signups: Number(signups?.n ?? 0),
    ranAnything: Number(ranAnything?.n ?? 0),
    completedCommittee: Number(completedCommittee?.n ?? 0),
    returned: Number(returned?.n ?? 0),
  };
}
