begin;

-- =========================================================
-- MEETING CANDIDATE SCOPE
-- Validasi kelayakan pimpinan, notulis, pemilik agenda,
-- dan peserta berdasarkan assignment organisasi.
-- =========================================================


-- ---------------------------------------------------------
-- 1. INTERNAL HELPER
-- Memeriksa apakah profil aktif memiliki assignment aktif
-- pada lingkup organisasi rapat.
-- ---------------------------------------------------------

create or replace function public.meeting_candidate_is_eligible(
    p_profile_id uuid,
    p_org_node_id uuid,
    p_department_node_id uuid,
    p_division_node_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
    if p_profile_id is null or p_org_node_id is null then
        return false;
    end if;

    -- Unit harus valid dan aktif.
    if not exists (
        select 1
          from public.org_nodes n
         where n.id = p_org_node_id
           and n.kind = 'unit'
           and n.is_active = true
    ) then
        return false;
    end if;

    -- Departemen, jika dipilih, harus merupakan anak unit.
    if p_department_node_id is not null and not exists (
        select 1
          from public.org_nodes d
         where d.id = p_department_node_id
           and d.kind = 'departemen'
           and d.parent_id = p_org_node_id
           and d.is_active = true
    ) then
        return false;
    end if;

    -- Divisi harus berada di bawah departemen terpilih.
    if p_division_node_id is not null then
        if p_department_node_id is null then
            return false;
        end if;

        if not exists (
            with recursive ancestors(id, parent_id, kind, is_active) as (
                select n.id, n.parent_id, n.kind, n.is_active
                  from public.org_nodes n
                 where n.id = p_division_node_id

                union all

                select parent.id, parent.parent_id,
                       parent.kind, parent.is_active
                  from public.org_nodes parent
                  join ancestors child on child.parent_id = parent.id
            )
            select 1
              from ancestors division
             where division.id = p_division_node_id
               and division.kind = 'divisi'
               and division.is_active = true
               and exists (
                   select 1
                     from ancestors department
                    where department.id = p_department_node_id
                      and department.kind = 'departemen'
                      and department.is_active = true
               )
        ) then
            return false;
        end if;
    end if;

    -- Profil harus aktif dan memiliki minimal satu assignment
    -- pada node yang diizinkan serta posisi yang masih aktif.
    return exists (
        with recursive scope_nodes(id, kind) as (
            select n.id, n.kind
              from public.org_nodes n
             where n.id = case
                 when p_division_node_id is not null
                     then p_division_node_id
                 when p_department_node_id is not null
                     then p_department_node_id
                 else p_org_node_id
             end
               and n.is_active = true

            union all

            select child.id, child.kind
              from public.org_nodes child
              join scope_nodes parent on child.parent_id = parent.id
             where child.is_active = true
               and p_division_node_id is null
               and (
                   (
                       p_department_node_id is null
                       and child.kind in ('departemen', 'divisi')
                   )
                   or
                   (
                       p_department_node_id is not null
                       and child.kind = 'divisi'
                   )
               )
        )
        select 1
          from public.profiles p
          join public.user_assignments ua on ua.user_id = p.id
          join public.org_nodes assigned on assigned.id = ua.org_node_id
          join public.positions pos on pos.id = ua.position_id
         where p.id = p_profile_id
           and p.is_active = true
           and assigned.is_active = true
           and pos.is_active = true
           and exists (
               select 1
                 from scope_nodes sn
                where sn.id = assigned.id
           )
    );
end;
$function$;


-- ---------------------------------------------------------
-- ---------------------------------------------------------
-- 1B. REPLACE MEETING CREATION AUTHORIZATION
-- Assignment dengan posisi nonaktif tidak memberikan
-- kewenangan membuat rapat.
-- ---------------------------------------------------------

create or replace function public.can_create_meeting_in_scope(
    p_org_node_id uuid,
    p_department_node_id uuid,
    p_division_node_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
    v_user_id uuid := (select auth.uid());
    v_role public.app_role;
begin
    if v_user_id is null or not public.is_session_valid() then
        return false;
    end if;

    -- Super Admin tetap memiliki kewenangan lintas unit.
    if public.is_super_admin() then
        return true;
    end if;

    select p.role into v_role
      from public.profiles p
     where p.id = v_user_id
       and p.is_active = true;

    if v_role is null then
        return false;
    end if;

    -- Validasi unit, departemen, dan divisi tujuan.
    if not exists (
        select 1 from public.org_nodes n
         where n.id = p_org_node_id
           and n.kind = 'unit'
           and n.is_active = true
    ) then
        return false;
    end if;

    if p_department_node_id is not null and not exists (
        select 1 from public.org_nodes d
         where d.id = p_department_node_id
           and d.kind = 'departemen'
           and d.parent_id = p_org_node_id
           and d.is_active = true
    ) then
        return false;
    end if;

    if p_division_node_id is not null and (
        p_department_node_id is null or not exists (
            with recursive division_ancestors(id, parent_id, kind, is_active) as (
                select n.id, n.parent_id, n.kind, n.is_active
                  from public.org_nodes n
                 where n.id = p_division_node_id
                union all
                select parent.id, parent.parent_id, parent.kind, parent.is_active
                  from public.org_nodes parent
                  join division_ancestors child on child.parent_id = parent.id
            )
            select 1
              from division_ancestors
             where id = p_division_node_id
               and kind = 'divisi'
               and is_active = true
               and exists (
                   select 1 from division_ancestors a
                    where a.id = p_department_node_id
                      and a.kind = 'departemen'
                      and a.is_active = true
               )
        )
    ) then
        return false;
    end if;

    -- CEO: assignment Grup dan posisi harus aktif.
    if v_role = 'ceo' then
        return exists (
            select 1
              from public.user_assignments ua
              join public.org_nodes assigned on assigned.id = ua.org_node_id
              join public.positions pos on pos.id = ua.position_id
             where ua.user_id = v_user_id
               and assigned.kind = 'grup'
               and assigned.is_active = true
               and pos.is_active = true
        );
    end if;

    -- Direktur Unit: assignment tepat pada unit tujuan.
    if v_role = 'direktur_unit' then
        return exists (
            select 1
              from public.user_assignments ua
              join public.org_nodes assigned on assigned.id = ua.org_node_id
              join public.positions pos on pos.id = ua.position_id
             where ua.user_id = v_user_id
               and ua.org_node_id = p_org_node_id
               and assigned.kind = 'unit'
               and assigned.is_active = true
               and pos.is_active = true
        );
    end if;

    -- Manager: assignment unit, departemen, atau divisi.
    if v_role = 'manager' then
        return exists (
            with recursive assigned_divisions(root_id, id) as (
                select ua.org_node_id, ua.org_node_id
                  from public.user_assignments ua
                  join public.org_nodes assigned on assigned.id = ua.org_node_id
                  join public.positions pos on pos.id = ua.position_id
                 where ua.user_id = v_user_id
                   and assigned.kind = 'divisi'
                   and assigned.is_active = true
                   and pos.is_active = true
                union all
                select ad.root_id, child.id
                  from public.org_nodes child
                  join assigned_divisions ad on child.parent_id = ad.id
                 where child.is_active = true
            )
            select 1
              from public.user_assignments ua
              join public.org_nodes assigned on assigned.id = ua.org_node_id
              join public.positions pos on pos.id = ua.position_id
             where ua.user_id = v_user_id
               and assigned.is_active = true
               and pos.is_active = true
               and (
                   (assigned.kind = 'unit' and assigned.id = p_org_node_id)
                   or
                   (assigned.kind = 'departemen'
                    and assigned.id = p_department_node_id)
                   or
                   (assigned.kind = 'divisi'
                    and p_division_node_id is not null
                    and exists (
                        select 1 from assigned_divisions ad
                         where ad.root_id = assigned.id
                           and ad.id = p_division_node_id
                    ))
               )
        );
    end if;

    -- Kepala Divisi: hanya divisi yang ditugaskan.
    if v_role = 'kepala_divisi' then
        if p_division_node_id is null then
            return false;
        end if;

        return exists (
            with recursive assigned_divisions(id) as (
                select ua.org_node_id
                  from public.user_assignments ua
                  join public.org_nodes assigned on assigned.id = ua.org_node_id
                  join public.positions pos on pos.id = ua.position_id
                 where ua.user_id = v_user_id
                   and assigned.kind = 'divisi'
                   and assigned.is_active = true
                   and pos.is_active = true
                union all
                select child.id
                  from public.org_nodes child
                  join assigned_divisions parent on child.parent_id = parent.id
                 where child.is_active = true
            )
            select 1 from assigned_divisions where id = p_division_node_id
        );
    end if;

    return false;
end;
$function$;

-- 2. USER-FACING RPC
-- Mengembalikan kandidat minimal: id dan full_name.
-- ---------------------------------------------------------

create or replace function public.get_meeting_candidates(
    p_org_node_id uuid,
    p_department_node_id uuid,
    p_division_node_id uuid
)
returns table (
    id uuid,
    full_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
    if (select auth.uid()) is null
       or not public.is_session_valid() then
        raise exception 'Sesi tidak valid.'
            using errcode = '42501';
    end if;

    if not public.can_create_meeting_in_scope(
        p_org_node_id,
        p_department_node_id,
        p_division_node_id
    ) then
        raise exception 'Tidak memiliki akses ke lingkup rapat ini.'
            using errcode = '42501';
    end if;

    return query
    select p.id, p.full_name
      from public.profiles p
     where p.is_active = true
       and public.meeting_candidate_is_eligible(
           p.id,
           p_org_node_id,
           p_department_node_id,
           p_division_node_id
       )
     order by p.full_name;
end;
$function$;


-- ---------------------------------------------------------
-- 3. MEETING SCOPE TRIGGER
-- Memvalidasi pimpinan dan notulis.
-- Jika scope rapat berubah, seluruh peserta dan pemilik
-- agenda yang sudah ada harus tetap memenuhi scope baru.
-- ---------------------------------------------------------

create or replace function public.meetings_candidate_scope_validate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
    if not public.meeting_candidate_is_eligible(
        new.leader_id,
        new.org_node_id,
        new.department_node_id,
        new.division_node_id
    ) then
        raise exception 'Pimpinan rapat tidak memenuhi assignment pada lingkup rapat.'
            using errcode = '23514';
    end if;

    if new.notetaker_id is not null
       and not public.meeting_candidate_is_eligible(
           new.notetaker_id,
           new.org_node_id,
           new.department_node_id,
           new.division_node_id
       ) then
        raise exception 'Notulis tidak memenuhi assignment pada lingkup rapat.'
            using errcode = '23514';
    end if;

    if tg_op = 'UPDATE'
       and (
           old.org_node_id is distinct from new.org_node_id
           or old.department_node_id is distinct from new.department_node_id
           or old.division_node_id is distinct from new.division_node_id
       ) then

        if exists (
            select 1
              from public.meeting_participants mp
             where mp.meeting_id = new.id
               and not public.meeting_candidate_is_eligible(
                   mp.profile_id,
                   new.org_node_id,
                   new.department_node_id,
                   new.division_node_id
               )
        ) then
            raise exception 'Perubahan lingkup ditolak: terdapat peserta yang tidak memenuhi assignment pada lingkup baru.'
                using errcode = '23514';
        end if;

        if exists (
            select 1
              from public.meeting_agendas ma
             where ma.meeting_id = new.id
               and ma.owner_id is not null
               and not public.meeting_candidate_is_eligible(
                   ma.owner_id,
                   new.org_node_id,
                   new.department_node_id,
                   new.division_node_id
               )
        ) then
            raise exception 'Perubahan lingkup ditolak: terdapat pemilik agenda yang tidak memenuhi assignment pada lingkup baru.'
                using errcode = '23514';
        end if;
    end if;

    return new;
end;
$function$;


-- ---------------------------------------------------------
-- 4. AGENDA OWNER TRIGGER
-- Memastikan pemilik agenda memenuhi scope rapat.
-- ---------------------------------------------------------

create or replace function public.meeting_agenda_candidate_scope_validate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_org_node_id uuid;
    v_department_node_id uuid;
    v_division_node_id uuid;
begin
    if new.owner_id is null then
        return new;
    end if;

    select m.org_node_id,
           m.department_node_id,
           m.division_node_id
      into v_org_node_id,
           v_department_node_id,
           v_division_node_id
      from public.meetings m
     where m.id = new.meeting_id;

    if not found then
        raise exception 'Rapat tidak ditemukan.'
            using errcode = '23503';
    end if;

    if not public.meeting_candidate_is_eligible(
        new.owner_id,
        v_org_node_id,
        v_department_node_id,
        v_division_node_id
    ) then
        raise exception 'Pemilik agenda tidak memenuhi assignment pada lingkup rapat.'
            using errcode = '23514';
    end if;

    return new;
end;
$function$;


-- ---------------------------------------------------------
-- 5. PARTICIPANT TRIGGER
-- Memastikan peserta memenuhi scope rapat.
-- ---------------------------------------------------------

create or replace function public.meeting_participant_candidate_scope_validate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_org_node_id uuid;
    v_department_node_id uuid;
    v_division_node_id uuid;
begin
    select m.org_node_id,
           m.department_node_id,
           m.division_node_id
      into v_org_node_id,
           v_department_node_id,
           v_division_node_id
      from public.meetings m
     where m.id = new.meeting_id;

    if not found then
        raise exception 'Rapat tidak ditemukan.'
            using errcode = '23503';
    end if;

    if not public.meeting_candidate_is_eligible(
        new.profile_id,
        v_org_node_id,
        v_department_node_id,
        v_division_node_id
    ) then
        raise exception 'Peserta tidak memenuhi assignment pada lingkup rapat.'
            using errcode = '23514';
    end if;

    return new;
end;
$function$;


-- ---------------------------------------------------------
-- 6. TRIGGERS
-- Trigger validasi lama tetap dipertahankan.
-- ---------------------------------------------------------

drop trigger if exists meetings_candidate_scope_trigger
    on public.meetings;

create trigger meetings_candidate_scope_trigger
before insert or update of
    org_node_id,
    department_node_id,
    division_node_id,
    leader_id,
    notetaker_id
on public.meetings
for each row
execute function public.meetings_candidate_scope_validate();


drop trigger if exists meeting_agendas_candidate_scope_trigger
    on public.meeting_agendas;

create trigger meeting_agendas_candidate_scope_trigger
before insert or update of meeting_id, owner_id
on public.meeting_agendas
for each row
execute function public.meeting_agenda_candidate_scope_validate();


drop trigger if exists meeting_participants_candidate_scope_trigger
    on public.meeting_participants;

create trigger meeting_participants_candidate_scope_trigger
before insert or update of meeting_id, profile_id
on public.meeting_participants
for each row
execute function public.meeting_participant_candidate_scope_validate();


-- ---------------------------------------------------------
-- 7. FUNCTION PRIVILEGES
-- Helper dan trigger functions tidak boleh dipanggil
-- langsung oleh client.
-- ---------------------------------------------------------

revoke all on function public.meeting_candidate_is_eligible(
    uuid, uuid, uuid, uuid
) from public, anon, authenticated;

revoke all on function public.meetings_candidate_scope_validate()
    from public, anon, authenticated;

revoke all on function public.meeting_agenda_candidate_scope_validate()
    from public, anon, authenticated;

revoke all on function public.meeting_participant_candidate_scope_validate()
    from public, anon, authenticated;

revoke all on function public.get_meeting_candidates(
    uuid, uuid, uuid
) from public, anon, authenticated;

grant execute on function public.get_meeting_candidates(
    uuid, uuid, uuid
) to authenticated;

commit;
