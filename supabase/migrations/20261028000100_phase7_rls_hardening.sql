-- Phase 7: two row-level-security gaps the boundary probe found.
--
-- Both were found by applying the migrations to a real PostgreSQL server and
-- driving them as two different accounts (scripts/rls/). Neither is visible in
-- preview mode, and neither shows up as an error: RLS silently matches zero
-- rows, so a blocked delete looks like a successful one that removed nothing.
--
--   1. `profiles` had select, insert and update policies but no delete policy,
--      so closing an account could never remove the profile row. The app's
--      closure loop asks for exactly that delete last.
--   2. The Phase 5 and Phase 6 tables check only their own `user_id`, while the
--      first migration's child tables additionally prove that the row they
--      point at belongs to the same account. That left two places where one
--      account could write a reference to another account's row id: an answer
--      can name somebody else's interview, and a saved document can name
--      somebody else's saved role. Nothing is disclosed by the write, but the
--      id's existence becomes observable, and a future read that follows the
--      pointer would have a foreign row to follow.
--
-- Nothing is dropped or rewritten in place. Existing rows all point at rows the
-- same account owns, because that is the only thing the application ever writes,
-- so tightening the check cannot orphan anything already stored.

-- 1. Closing an account deletes the profile last: every learning record is
--    already gone, so the remaining row is the record of who the learner is.
create policy "Profiles: delete own"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

-- 2. An answer belongs to one interview of the answering account's own. The
--    interview id is not nullable in the application's write path, and a null
--    stays allowed so a hand-corrected row cannot be locked out of its own
--    update by a policy that only ever meant to check the pointer.
drop policy "Interview attempts: insert own" on public.interview_attempts;
drop policy "Interview attempts: update own" on public.interview_attempts;

create policy "Interview attempts: insert own"
on public.interview_attempts for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    interview_id is null
    or exists (
      select 1 from public.mock_interviews m
      where m.id = interview_id
        and m.user_id = (select auth.uid())
    )
  )
);

create policy "Interview attempts: update own"
on public.interview_attempts for update
to authenticated
using (
  (select auth.uid()) = user_id
  and (
    interview_id is null
    or exists (
      select 1 from public.mock_interviews m
      where m.id = interview_id
        and m.user_id = (select auth.uid())
    )
  )
)
with check (
  (select auth.uid()) = user_id
  and (
    interview_id is null
    or exists (
      select 1 from public.mock_interviews m
      where m.id = interview_id
        and m.user_id = (select auth.uid())
    )
  )
);

-- 3. A saved document may point at a saved role, and clearing that role sets the
--    pointer back to null rather than deleting the text the learner wrote.
drop policy "Materials: insert own" on public.application_materials;
drop policy "Materials: update own" on public.application_materials;

create policy "Materials: insert own"
on public.application_materials for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    application_id is null
    or exists (
      select 1 from public.job_applications j
      where j.id = application_id
        and j.user_id = (select auth.uid())
    )
  )
);

create policy "Materials: update own"
on public.application_materials for update
to authenticated
using (
  (select auth.uid()) = user_id
  and (
    application_id is null
    or exists (
      select 1 from public.job_applications j
      where j.id = application_id
        and j.user_id = (select auth.uid())
    )
  )
)
with check (
  (select auth.uid()) = user_id
  and (
    application_id is null
    or exists (
      select 1 from public.job_applications j
      where j.id = application_id
        and j.user_id = (select auth.uid())
    )
  )
);

-- The first two migrations granted each table explicitly; the Phase 5 and
-- Phase 6 files relied on the project's default privileges instead. Supabase
-- does set those, so this changes nothing on a hosted project — it makes the
-- migration readable on its own.
grant select, insert, update, delete on public.mock_interviews to authenticated;
grant select, insert, update, delete on public.interview_attempts to authenticated;
grant select, insert, update, delete on public.application_materials to authenticated;
