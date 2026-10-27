-- Phase 5: Career Explorer support.
-- career_experiments and career_preferences already exist with owner-only
-- row-level security, but two gaps block the feature and the deletion
-- workflow that has to cover it.

-- 1. An experiment row is identified by the role it tests. Without a unique
--    constraint a double click could create two rows for the same role, which
--    would make the reflection average meaningless and let one role be counted
--    twice in the ranking.
create unique index if not exists career_experiments_user_career_idx
  on public.career_experiments (user_id, career_slug);

-- 2. career_experiments already has a delete policy, so a learner can clear a
--    result they recorded wrongly and start that role again.
--    career_preferences had read, insert and update policies only, so
--    /settings could never remove a stored specialization choice. That left
--    one table outside the account data deletion workflow.
create policy "Career preferences: delete own"
on public.career_preferences for delete
to authenticated
using ((select auth.uid()) = user_id);
