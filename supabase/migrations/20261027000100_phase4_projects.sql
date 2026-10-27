-- Phase 4: Project Lab support.
-- The projects and project_milestones tables already exist with owner-only
-- row-level security. Milestones need a stable template key so a project
-- created from a template can be re-linked to that template's guidance, and so
-- re-running the seed for one project cannot duplicate its milestones.

alter table public.project_milestones
  add column if not exists template_key text;

create unique index if not exists project_milestones_project_key_idx
  on public.project_milestones (project_id, template_key)
  where template_key is not null;
