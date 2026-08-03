/**
 * There's no real roles/permissions system yet -- just one operator account
 * running the product. This is the single gate for anything that's the
 * operator's own business (e.g. the founder funnel stats), not something
 * every signed-up user should see about every other user. Revisit this the
 * day a second operator actually exists.
 */
export const OWNER_USER_ID = 1;
