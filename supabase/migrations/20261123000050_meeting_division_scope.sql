begin;

-- =========================================================
-- YP-MMS - ORGANIZATION DIVISION SCOPE FOR MEETINGS
-- Apply in DEVELOPMENT before 20261123000100_meeting_operations.sql.
-- =========================================================

alter table public.meetings
    add column division_node_id uuid null;

alter table public.meetings
    add constraint meetings_division_node_id_fkey
    foreign key (division_node_id)
    references public.org_nodes(id)
    on delete restrict;

create index meetings_division_node_id_idx
    on public.meetings (division_node_id)
    where division_node_id is not null;

-- Update visibility scope so division-level Internal meetings do not
-- become visible to users assigned to sibling divisions.
create or replace function public.can_view_meeting(p_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
    select coalesce((
        with recursive
        target as (
            select
                m.id,
                m.org_node_id,
                m.department_node_id,
                m.division_node_id,
                m.classification
            from public.meetings m
            where m.id = p_meeting_id
        ),
        unit_ancestors(id, parent_id) as (
            select n.id, n.parent_id
              from public.org_nodes n
              join target t on t.org_node_id = n.id
            union all
            select p.id, p.parent_id
              from public.org_nodes p
              join unit_ancestors a on p.id = a.parent_id
        ),
        unit_descendants(id) as (
            select n.id
              from public.org_nodes n
              join target t on t.org_node_id = n.id
            union all
            select child.id
              from public.org_nodes child
              join unit_descendants d on child.parent_id = d.id
        ),
        department_descendants(id) as (
            select n.id
              from public.org_nodes n
              join target t on t.department_node_id = n.id
            union all
            select child.id
              from public.org_nodes child
              join department_descendants d on child.parent_id = d.id
        ),
        division_descendants(id) as (
            select n.id
              from public.org_nodes n
              join target t on t.division_node_id = n.id
            union all
            select child.id
              from public.org_nodes child
              join division_descendants d on child.parent_id = d.id
        ),
        scopes as (
            select
                exists (
                    select 1
                      from public.user_assignments ua
                     where ua.user_id = (select auth.uid())
                       and exists (
                           select 1 from public.org_nodes active_node
                            where active_node.id = ua.org_node_id
                              and active_node.is_active = true
                       )
                       and (
                           ua.org_node_id in (select id from unit_ancestors)
                           or ua.org_node_id in (select id from unit_descendants)
                       )
                ) as in_unit_scope,
                exists (
                    select 1
                      from public.user_assignments ua
                      cross join target t
                     where ua.user_id = (select auth.uid())
                       and exists (
                           select 1 from public.org_nodes active_node
                            where active_node.id = ua.org_node_id
                              and active_node.is_active = true
                       )
                       and (
                           ua.org_node_id = t.org_node_id
                           or (
                               t.department_node_id is null
                               and ua.org_node_id in (select id from unit_descendants)
                           )
                           or (
                               t.department_node_id is not null
                               and t.division_node_id is null
                               and ua.org_node_id in (select id from department_descendants)
                           )
                           or (
                               t.division_node_id is not null
                               and (
                                   ua.org_node_id = t.department_node_id
                                   or ua.org_node_id in (select id from division_descendants)
                               )
                           )
                       )
                ) as in_meeting_scope
        )
        select
            public.is_session_valid()
            and (
                (
                    t.classification = 'Umum'
                    and s.in_unit_scope
                )
                or (
                    t.classification = 'Internal'
                    and (
                        s.in_meeting_scope
                        or exists (
                            select 1 from public.meeting_participants mp
                             where mp.meeting_id = t.id
                               and mp.profile_id = (select auth.uid())
                        )
                        or exists (
                            select 1 from public.meeting_access ma
                             where ma.meeting_id = t.id
                               and ma.profile_id = (select auth.uid())
                        )
                    )
                )
                or (
                    t.classification = 'Rahasia'
                    and (
                        exists (
                            select 1 from public.meeting_participants mp
                             where mp.meeting_id = t.id
                               and mp.profile_id = (select auth.uid())
                        )
                        or exists (
                            select 1 from public.meeting_access ma
                             where ma.meeting_id = t.id
                               and ma.profile_id = (select auth.uid())
                        )
                    )
                )
            )
        from target t
        cross join scopes s
    ), false);
$function$;

create or replace function public.meetings_validate_division()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
    if new.division_node_id is null then
        return new;
    end if;

    if new.department_node_id is null then
        raise exception 'Divisi hanya dapat dipilih jika departemen rapat sudah dipilih.'
            using errcode = '23514';
    end if;

    if not exists (
        with recursive division_ancestors(id, parent_id, kind, is_active) as (
            select n.id, n.parent_id, n.kind, n.is_active
              from public.org_nodes n
             where n.id = new.division_node_id
            union all
            select parent.id, parent.parent_id, parent.kind, parent.is_active
              from public.org_nodes parent
              join division_ancestors child on child.parent_id = parent.id
        )
        select 1
          from division_ancestors d
         where d.id = new.division_node_id
           and d.kind = 'divisi'
           and d.is_active = true
           and exists (
               select 1
                 from division_ancestors a
                where a.id = new.department_node_id
                  and a.kind = 'departemen'
                  and a.is_active = true
           )
    ) then
        raise exception 'Divisi harus aktif dan berada di bawah departemen yang dipilih.'
            using errcode = '23514';
    end if;

    return new;
end;
$function$;

create trigger meetings_validate_division_trigger
before insert or update of org_node_id, department_node_id, division_node_id
on public.meetings
for each row
execute function public.meetings_validate_division();

revoke all on function public.meetings_validate_division() from public, anon, authenticated;

comment on column public.meetings.division_node_id is
    'Optional division scope. Must be a descendant of the selected department; used for precise division-level authorization.';

commit;
