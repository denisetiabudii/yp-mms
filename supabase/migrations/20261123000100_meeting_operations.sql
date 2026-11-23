begin;

-- =========================================================
-- YP-MMS - MIGRATION 2: MEETING OPERATIONS
-- Target: Supabase DEVELOPMENT only
-- Baseline: PRD v1.0 + approved implementation decisions
-- DEPENDENCY: apply 20261123000050_meeting_division_scope.sql first.
-- Do not run against Production.
-- =========================================================

-- ---------------------------------------------------------
-- 1. INTERNAL AUTHORIZATION HELPERS
-- ---------------------------------------------------------

-- Create-meeting authority is based on BOTH app_role and an
-- active organization assignment. Super Admin is the only
-- role with cross-unit creation authority without assignment.
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

    -- Validate target unit, optional department, and optional division.
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

    -- CEO: an active Group assignment authorizes all units.
    if v_role = 'ceo' then
        return exists (
            select 1
              from public.user_assignments ua
              join public.org_nodes assigned on assigned.id = ua.org_node_id
             where ua.user_id = v_user_id
               and assigned.kind = 'grup'
               and assigned.is_active = true
        );
    end if;

    -- Direktur Unit: assignment must be exactly the target unit.
    if v_role = 'direktur_unit' then
        return exists (
            select 1
              from public.user_assignments ua
              join public.org_nodes assigned on assigned.id = ua.org_node_id
             where ua.user_id = v_user_id
               and ua.org_node_id = p_org_node_id
               and assigned.kind = 'unit'
               and assigned.is_active = true
        );
    end if;

    -- Manager: unit assignment covers the unit; department assignment
    -- covers that department and its division descendants; division
    -- assignment covers only that division and its descendants.
    if v_role = 'manager' then
        return exists (
            with recursive assigned_divisions(root_id, id) as (
                select ua.org_node_id, ua.org_node_id
                  from public.user_assignments ua
                  join public.org_nodes assigned on assigned.id = ua.org_node_id
                 where ua.user_id = v_user_id
                   and assigned.kind = 'divisi'
                   and assigned.is_active = true
                union all
                select ad.root_id, child.id
                  from public.org_nodes child
                  join assigned_divisions ad on child.parent_id = ad.id
                 where child.is_active = true
            )
            select 1
              from public.user_assignments ua
              join public.org_nodes assigned on assigned.id = ua.org_node_id
             where ua.user_id = v_user_id
               and assigned.is_active = true
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

    -- Kepala Divisi: only the assigned division and its descendants.
    if v_role = 'kepala_divisi' then
        if p_division_node_id is null then
            return false;
        end if;

        return exists (
            with recursive assigned_divisions(id) as (
                select ua.org_node_id
                  from public.user_assignments ua
                  join public.org_nodes assigned on assigned.id = ua.org_node_id
                 where ua.user_id = v_user_id
                   and assigned.kind = 'divisi'
                   and assigned.is_active = true
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

-- Existing meeting operation authority:
-- * scope managers above
-- * Notulis assigned as notetaker
-- * Pimpinan Rapat assigned as leader
create or replace function public.can_manage_meeting(
    p_meeting_id uuid
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
    v_meeting public.meetings%rowtype;
begin
    if not public.is_session_valid() or v_user_id is null then
        return false;
    end if;

    select *
      into v_meeting
      from public.meetings m
     where m.id = p_meeting_id;

    if not found then
        return false;
    end if;

    if public.can_create_meeting_in_scope(
        v_meeting.org_node_id,
        v_meeting.department_node_id,
        v_meeting.division_node_id
    ) then
        return true;
    end if;

    select p.role
      into v_role
      from public.profiles p
     where p.id = v_user_id
       and p.is_active = true;

    if v_role = 'notulis' and v_meeting.notetaker_id = v_user_id then
        return true;
    end if;

    if v_role = 'pimpinan_rapat' and v_meeting.leader_id = v_user_id then
        return true;
    end if;

    return false;
end;
$function$;

-- ---------------------------------------------------------
-- 2. MEETING NUMBER GENERATOR
-- ---------------------------------------------------------

create or replace function public.generate_meeting_number(
    p_org_node_id uuid,
    p_department_node_id uuid,
    p_start_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_unit_code text;
    v_department_code text;
    v_pattern text;
    v_seq_pad integer;
    v_seq_reset text;
    v_counter_year integer;
    v_seq integer;
    v_month integer;
    v_roman_month text;
    v_number text;
    v_setting jsonb;
begin
    if p_start_at is null then
        raise exception 'Waktu mulai rapat wajib diisi.'
            using errcode = '22004';
    end if;

    select n.code
      into v_unit_code
      from public.org_nodes n
     where n.id = p_org_node_id
       and n.kind = 'unit'
       and n.is_active = true;

    if v_unit_code is null or btrim(v_unit_code) = '' then
        raise exception 'Kode unit tidak ditemukan atau unit tidak aktif.'
            using errcode = '22023';
    end if;

    if p_department_node_id is null then
        v_department_code := 'UMUM';
    else
        select n.code
          into v_department_code
          from public.org_nodes n
         where n.id = p_department_node_id
           and n.kind = 'departemen'
           and n.parent_id = p_org_node_id
           and n.is_active = true;

        if v_department_code is null or btrim(v_department_code) = '' then
            raise exception 'Kode departemen tidak ditemukan atau departemen tidak valid.'
                using errcode = '22023';
        end if;
    end if;

    select s.value
      into v_setting
      from public.app_settings s
     where s.key = 'meeting_number_format';

    if v_setting is null then
        raise exception 'Pengaturan meeting_number_format belum tersedia.'
            using errcode = '55000';
    end if;

    v_pattern := v_setting ->> 'pattern';
    v_seq_pad := coalesce((v_setting ->> 'seq_pad')::integer, 3);
    v_seq_reset := coalesce(v_setting ->> 'seq_reset', 'yearly_per_unit');

    if v_pattern is null or v_pattern = ''
       or v_seq_pad < 1 or v_seq_pad > 8
       or v_seq_reset <> 'yearly_per_unit' then
        raise exception 'Pengaturan format nomor rapat tidak valid.'
            using errcode = '55000';
    end if;

    v_counter_year := extract(
        year from (p_start_at at time zone 'Asia/Jakarta')
    )::integer;

    v_month := extract(
        month from (p_start_at at time zone 'Asia/Jakarta')
    )::integer;

    v_roman_month := case v_month
        when 1 then 'I'
        when 2 then 'II'
        when 3 then 'III'
        when 4 then 'IV'
        when 5 then 'V'
        when 6 then 'VI'
        when 7 then 'VII'
        when 8 then 'VIII'
        when 9 then 'IX'
        when 10 then 'X'
        when 11 then 'XI'
        when 12 then 'XII'
    end;

    -- Atomic per-unit/per-year counter. Concurrent requests
    -- cannot receive the same sequence number.
    insert into public.meeting_number_counters (
        org_node_id,
        counter_year,
        last_value
    )
    values (
        p_org_node_id,
        v_counter_year,
        1
    )
    on conflict (org_node_id, counter_year)
    do update
       set last_value = public.meeting_number_counters.last_value + 1
    returning last_value into v_seq;

    v_number := v_pattern;
    v_number := replace(v_number, '{unit}', upper(v_unit_code));
    v_number := replace(v_number, '{dept}', upper(v_department_code));
    v_number := replace(v_number, '{seq}', lpad(v_seq::text, v_seq_pad, '0'));
    v_number := replace(v_number, '{roman_month}', v_roman_month);
    v_number := replace(v_number, '{year}', v_counter_year::text);

    if v_number ~ '\{[^}]+\}' then
        raise exception 'Format nomor rapat mengandung token yang tidak dikenal: %', v_number
            using errcode = '55000';
    end if;

    return v_number;
end;
$function$;

-- ---------------------------------------------------------
-- 3. CREATE MEETING + FIRST AGENDA ATOMICALLY
-- ---------------------------------------------------------

create or replace function public.create_meeting(
    p_title text,
    p_meeting_type_id text,
    p_org_node_id uuid,
    p_department_node_id uuid,
    p_division_node_id uuid,
    p_classification text,
    p_start_at timestamptz,
    p_end_at timestamptz,
    p_mode text,
    p_location text,
    p_meeting_link text,
    p_leader_id uuid,
    p_notetaker_id uuid,
    p_purpose text,
    p_first_agenda_topic text,
    p_first_agenda_owner_id uuid,
    p_first_agenda_duration_minutes integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_user_id uuid := (select auth.uid());
    v_meeting_id uuid;
    v_meeting_number text;
begin
    if v_user_id is null or not public.is_session_valid() then
        raise exception 'Sesi tidak valid. Silakan login kembali.'
            using errcode = '42501';
    end if;

    if not public.can_create_meeting_in_scope(
        p_org_node_id,
        p_department_node_id,
        p_division_node_id
    ) then
        raise exception 'Anda tidak memiliki kewenangan membuat rapat pada lingkup organisasi ini.'
            using errcode = '42501';
    end if;

    if not exists (
        select 1 from public.meeting_types mt
         where mt.id = p_meeting_type_id
           and mt.is_active = true
    ) then
        raise exception 'Jenis rapat tidak ditemukan atau tidak aktif.'
            using errcode = '22023';
    end if;

    if p_title is null or btrim(p_title) = ''
       or p_first_agenda_topic is null
       or btrim(p_first_agenda_topic) = '' then
        raise exception 'Judul rapat dan agenda pertama wajib diisi.'
            using errcode = '22023';
    end if;

    if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
        raise exception 'Rentang waktu rapat tidak valid.'
            using errcode = '22023';
    end if;

    v_meeting_number := public.generate_meeting_number(
        p_org_node_id,
        p_department_node_id,
        p_start_at
    );

    insert into public.meetings (
        meeting_number,
        title,
        purpose,
        meeting_type_id,
        org_node_id,
        department_node_id,
        division_node_id,
        classification,
        status,
        meeting_date,
        start_at,
        end_at,
        mode,
        location,
        meeting_link,
        leader_id,
        notetaker_id,
        created_by
    )
    values (
        v_meeting_number,
        btrim(p_title),
        nullif(btrim(coalesce(p_purpose, '')), ''),
        p_meeting_type_id,
        p_org_node_id,
        p_department_node_id,
        p_division_node_id,
        coalesce(p_classification, 'Umum'),
        'Dijadwalkan',
        (p_start_at at time zone 'Asia/Jakarta')::date,
        p_start_at,
        p_end_at,
        p_mode,
        nullif(btrim(coalesce(p_location, '')), ''),
        nullif(btrim(coalesce(p_meeting_link, '')), ''),
        p_leader_id,
        p_notetaker_id,
        v_user_id
    )
    returning id into v_meeting_id;

    insert into public.meeting_agendas (
        meeting_id,
        agenda_order,
        topic,
        owner_id,
        duration_minutes
    )
    values (
        v_meeting_id,
        1,
        btrim(p_first_agenda_topic),
        p_first_agenda_owner_id,
        p_first_agenda_duration_minutes
    );

    -- Leader and notetaker must be able to see their assigned meeting,
    -- including Internal and Rahasia classifications.
    insert into public.meeting_participants (meeting_id, profile_id)
    select v_meeting_id, participant.profile_id
      from (
          select p_leader_id as profile_id
          union
          select p_notetaker_id where p_notetaker_id is not null
      ) participant
    where participant.profile_id is not null
    on conflict (meeting_id, profile_id) do nothing;

    perform public.write_audit(
        'CREATE',
        'meeting',
        v_meeting_number,
        'Membuat rapat dan agenda pertama',
        jsonb_build_object(
            'meeting_id', v_meeting_id,
            'meeting_number', v_meeting_number,
            'title', btrim(p_title),
            'org_node_id', p_org_node_id,
            'department_node_id', p_department_node_id,
            'division_node_id', p_division_node_id,
            'classification', coalesce(p_classification, 'Umum'),
            'first_agenda', btrim(p_first_agenda_topic)
        )
    );

    return v_meeting_id;
end;
$function$;

-- ---------------------------------------------------------
-- 4. AGENDA OPERATIONS
-- ---------------------------------------------------------

create or replace function public.add_meeting_agenda(
    p_meeting_id uuid,
    p_topic text,
    p_owner_id uuid default null,
    p_duration_minutes integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_agenda_id uuid;
    v_next_order integer;
    v_meeting_number text;
begin
    if not public.can_manage_meeting(p_meeting_id) then
        raise exception 'Anda tidak memiliki akses untuk mengelola agenda rapat ini.'
            using errcode = '42501';
    end if;

    perform 1 from public.meetings
     where id = p_meeting_id
       and status in ('Dijadwalkan', 'Berlangsung')
     for update;
    if not found then
        raise exception 'Agenda hanya dapat diubah pada rapat terjadwal atau berlangsung.' using errcode = '23514';
    end if;

    if p_topic is null or btrim(p_topic) = '' then
        raise exception 'Topik agenda wajib diisi.'
            using errcode = '22023';
    end if;

    if p_duration_minutes is not null and p_duration_minutes <= 0 then
        raise exception 'Durasi agenda harus lebih dari nol.'
            using errcode = '22023';
    end if;

    -- The meeting row is already locked to serialize agenda ordering.

    select coalesce(max(a.agenda_order), 0) + 1
      into v_next_order
      from public.meeting_agendas a
     where a.meeting_id = p_meeting_id;

    insert into public.meeting_agendas (
        meeting_id, agenda_order, topic, owner_id, duration_minutes
    )
    values (
        p_meeting_id, v_next_order, btrim(p_topic),
        p_owner_id, p_duration_minutes
    )
    returning id into v_agenda_id;

    select meeting_number into v_meeting_number
      from public.meetings where id = p_meeting_id;

    perform public.write_audit(
        'CREATE',
        'meeting_agenda',
        v_meeting_number,
        'Menambahkan agenda rapat',
        jsonb_build_object(
            'meeting_id', p_meeting_id,
            'agenda_id', v_agenda_id,
            'agenda_order', v_next_order,
            'topic', btrim(p_topic)
        )
    );

    return v_agenda_id;
end;
$function$;

create or replace function public.update_meeting_agenda(
    p_agenda_id uuid,
    p_topic text,
    p_owner_id uuid,
    p_duration_minutes integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_meeting_id uuid;
    v_meeting_number text;
begin
    select a.meeting_id
      into v_meeting_id
      from public.meeting_agendas a
     where a.id = p_agenda_id;

    if v_meeting_id is null
       or not public.can_manage_meeting(v_meeting_id) then
        raise exception 'Agenda tidak ditemukan atau Anda tidak memiliki akses.'
            using errcode = '42501';
    end if;

    perform 1 from public.meetings
     where id = v_meeting_id
       and status in ('Dijadwalkan', 'Berlangsung')
     for update;
    if not found then
        raise exception 'Agenda hanya dapat diubah pada rapat terjadwal atau berlangsung.' using errcode = '23514';
    end if;

    if p_topic is null or btrim(p_topic) = ''
       or (p_duration_minutes is not null and p_duration_minutes <= 0) then
        raise exception 'Topik atau durasi agenda tidak valid.'
            using errcode = '22023';
    end if;

    update public.meeting_agendas
       set topic = btrim(p_topic),
           owner_id = p_owner_id,
           duration_minutes = p_duration_minutes
     where id = p_agenda_id;

    select meeting_number into v_meeting_number
      from public.meetings where id = v_meeting_id;

    perform public.write_audit(
        'UPDATE',
        'meeting_agenda',
        v_meeting_number,
        'Memperbarui agenda rapat',
        jsonb_build_object('meeting_id', v_meeting_id, 'agenda_id', p_agenda_id)
    );
end;
$function$;

create or replace function public.delete_meeting_agenda(
    p_agenda_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_meeting_id uuid;
    v_meeting_number text;
    v_status text;
    v_count integer;
begin
    select a.meeting_id
      into v_meeting_id
      from public.meeting_agendas a
     where a.id = p_agenda_id;

    if v_meeting_id is null
       or not public.can_manage_meeting(v_meeting_id) then
        raise exception 'Agenda tidak ditemukan atau Anda tidak memiliki akses.'
            using errcode = '42501';
    end if;

    perform 1 from public.meetings
     where id = v_meeting_id
       and status in ('Dijadwalkan', 'Berlangsung')
     for update;
    if not found then
        raise exception 'Agenda hanya dapat diubah pada rapat terjadwal atau berlangsung.' using errcode = '23514';
    end if;

    select m.meeting_number, m.status
      into v_meeting_number, v_status
      from public.meetings m
     where m.id = v_meeting_id;

    select count(*) into v_count
      from public.meeting_agendas
     where meeting_id = v_meeting_id;

    if v_status = 'Dijadwalkan' and v_count <= 1 then
        raise exception 'Rapat terjadwal wajib memiliki minimal satu agenda.'
            using errcode = '23514';
    end if;

    delete from public.meeting_agendas where id = p_agenda_id;

    perform public.write_audit(
        'DELETE',
        'meeting_agenda',
        v_meeting_number,
        'Menghapus agenda rapat',
        jsonb_build_object('meeting_id', v_meeting_id, 'agenda_id', p_agenda_id)
    );
end;
$function$;

-- ---------------------------------------------------------
-- 5. PARTICIPANT OPERATIONS
-- ---------------------------------------------------------

create or replace function public.add_meeting_participants(
    p_meeting_id uuid,
    p_profile_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_added integer;
    v_meeting_number text;
begin
    if not public.can_manage_meeting(p_meeting_id) then
        raise exception 'Anda tidak memiliki akses untuk mengelola peserta rapat ini.'
            using errcode = '42501';
    end if;

    perform 1 from public.meetings
     where id = p_meeting_id
       and status in ('Dijadwalkan', 'Berlangsung')
     for update;
    if not found then
        raise exception 'Peserta hanya dapat diubah pada rapat terjadwal atau berlangsung.' using errcode = '23514';
    end if;

    if p_profile_ids is null or cardinality(p_profile_ids) = 0 then
        raise exception 'Pilih minimal satu peserta.'
            using errcode = '22023';
    end if;

    if exists (
        select 1
          from unnest(p_profile_ids) as requested(profile_id)
          left join public.profiles p on p.id = requested.profile_id
         where p.id is null or p.is_active = false
    ) then
        raise exception 'Daftar peserta memuat profil yang tidak ditemukan atau tidak aktif.'
            using errcode = '22023';
    end if;

    insert into public.meeting_participants (meeting_id, profile_id)
    select p_meeting_id, requested.profile_id
      from (
          select distinct unnest(p_profile_ids) as profile_id
      ) requested
    on conflict (meeting_id, profile_id) do nothing;

    get diagnostics v_added = row_count;

    select meeting_number into v_meeting_number
      from public.meetings where id = p_meeting_id;

    perform public.write_audit(
        'UPDATE',
        'meeting_participants',
        v_meeting_number,
        'Menambahkan peserta rapat',
        jsonb_build_object(
            'meeting_id', p_meeting_id,
            'requested_profile_ids', to_jsonb(p_profile_ids),
            'added_count', v_added
        )
    );

    return v_added;
end;
$function$;

create or replace function public.remove_meeting_participant(
    p_meeting_id uuid,
    p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_meeting_number text;
begin
    if not public.can_manage_meeting(p_meeting_id) then
        raise exception 'Anda tidak memiliki akses untuk mengelola peserta rapat ini.'
            using errcode = '42501';
    end if;

    perform 1 from public.meetings
     where id = p_meeting_id
       and status in ('Dijadwalkan', 'Berlangsung')
     for update;
    if not found then
        raise exception 'Peserta hanya dapat diubah pada rapat terjadwal atau berlangsung.' using errcode = '23514';
    end if;

    -- The leader and notetaker must remain participants so their
    -- visibility for Internal/Rahasia meetings cannot be removed
    -- while their meeting-management authority is still active.
    if exists (
        select 1
          from public.meetings m
         where m.id = p_meeting_id
           and (m.leader_id = p_profile_id or m.notetaker_id = p_profile_id)
    ) then
        raise exception 'Pimpinan rapat dan notulis tidak dapat dihapus dari daftar peserta.'
            using errcode = '23514';
    end if;

    delete from public.meeting_participants
     where meeting_id = p_meeting_id
       and profile_id = p_profile_id;

    if not found then
        raise exception 'Peserta tidak ditemukan pada rapat ini.'
            using errcode = 'P0002';
    end if;

    select meeting_number into v_meeting_number
      from public.meetings where id = p_meeting_id;

    perform public.write_audit(
        'DELETE',
        'meeting_participant',
        v_meeting_number,
        'Menghapus peserta rapat',
        jsonb_build_object(
            'meeting_id', p_meeting_id,
            'profile_id', p_profile_id
        )
    );
end;
$function$;

create or replace function public.update_meeting_attendance(
    p_meeting_id uuid,
    p_profile_id uuid,
    p_attendance_status text,
    p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_user_id uuid := (select auth.uid());
    v_meeting_number text;
begin
    if not public.is_session_valid() then
        raise exception 'Sesi tidak valid.'
            using errcode = '42501';
    end if;

    -- A participant may update their own attendance.
    -- Meeting managers may update any participant.
    if p_profile_id <> v_user_id
       and not public.can_manage_meeting(p_meeting_id) then
        raise exception 'Anda tidak memiliki akses untuk mengubah kehadiran ini.'
            using errcode = '42501';
    end if;

    update public.meeting_participants
       set attendance_status = p_attendance_status,
           note = nullif(btrim(coalesce(p_note, '')), '')
     where meeting_id = p_meeting_id
       and profile_id = p_profile_id;

    if not found then
        raise exception 'Peserta tidak ditemukan pada rapat ini.'
            using errcode = 'P0002';
    end if;

    select meeting_number into v_meeting_number
      from public.meetings where id = p_meeting_id;

    perform public.write_audit(
        'UPDATE',
        'meeting_attendance',
        v_meeting_number,
        'Memperbarui status kehadiran peserta',
        jsonb_build_object(
            'meeting_id', p_meeting_id,
            'profile_id', p_profile_id,
            'attendance_status', p_attendance_status
        )
    );
end;
$function$;

-- ---------------------------------------------------------
-- 6. SCHEDULE CHANGE AND CANCELLATION
-- ---------------------------------------------------------

create or replace function public.reschedule_meeting(
    p_meeting_id uuid,
    p_start_at timestamptz,
    p_end_at timestamptz,
    p_mode text,
    p_location text,
    p_meeting_link text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_meeting_number text;
    v_status text;
begin
    select meeting_number, status
      into v_meeting_number, v_status
      from public.meetings
     where id = p_meeting_id
     for update;

    if not found then
        raise exception 'Rapat tidak ditemukan.' using errcode = 'P0002';
    end if;

    if not public.can_manage_meeting(p_meeting_id) then
        raise exception 'Anda tidak memiliki kewenangan mengubah jadwal rapat ini.'
            using errcode = '42501';
    end if;

    if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
        raise exception 'Rentang waktu rapat tidak valid.'
            using errcode = '22023';
    end if;

    if v_status in ('Selesai', 'Dibatalkan') then
        raise exception 'Rapat yang selesai atau dibatalkan tidak dapat dijadwalkan ulang.'
            using errcode = '23514';
    end if;

    update public.meetings
       set meeting_date = (p_start_at at time zone 'Asia/Jakarta')::date,
           start_at = p_start_at,
           end_at = p_end_at,
           mode = p_mode,
           location = nullif(btrim(coalesce(p_location, '')), ''),
           meeting_link = nullif(btrim(coalesce(p_meeting_link, '')), '')
     where id = p_meeting_id;

    perform public.write_audit(
        'UPDATE',
        'meeting_schedule',
        v_meeting_number,
        'Mengubah jadwal rapat',
        jsonb_build_object(
            'meeting_id', p_meeting_id,
            'start_at', p_start_at,
            'end_at', p_end_at,
            'mode', p_mode
        )
    );
end;
$function$;

create or replace function public.cancel_meeting(
    p_meeting_id uuid,
    p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_meeting_number text;
    v_status text;
begin
    select meeting_number, status
      into v_meeting_number, v_status
      from public.meetings
     where id = p_meeting_id
     for update;

    if not found then
        raise exception 'Rapat tidak ditemukan.' using errcode = 'P0002';
    end if;

    if not public.can_manage_meeting(p_meeting_id) then
        raise exception 'Anda tidak memiliki kewenangan membatalkan rapat ini.'
            using errcode = '42501';
    end if;

    if p_reason is null or btrim(p_reason) = '' then
        raise exception 'Alasan pembatalan wajib diisi.'
            using errcode = '22023';
    end if;

    if v_status = 'Selesai' then
        raise exception 'Rapat yang sudah selesai tidak dapat dibatalkan.'
            using errcode = '23514';
    end if;

    if v_status = 'Dibatalkan' then
        raise exception 'Rapat sudah berstatus dibatalkan.'
            using errcode = '23514';
    end if;

    update public.meetings
       set status = 'Dibatalkan',
           cancellation_reason = btrim(p_reason)
     where id = p_meeting_id;

    perform public.write_audit(
        'CANCEL',
        'meeting',
        v_meeting_number,
        'Membatalkan rapat',
        jsonb_build_object(
            'meeting_id', p_meeting_id,
            'reason', btrim(p_reason)
        )
    );
end;
$function$;

-- ---------------------------------------------------------
-- 7. EXPLICIT MEETING ACCESS
-- ---------------------------------------------------------

create or replace function public.grant_meeting_access(
    p_meeting_id uuid,
    p_profile_id uuid,
    p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_meeting_number text;
    v_classification text;
begin
    if not public.can_manage_meeting(p_meeting_id) then
        raise exception 'Anda tidak memiliki kewenangan mengatur akses rapat ini.' using errcode = '42501';
    end if;

    if p_reason is null or btrim(p_reason) = '' then
        raise exception 'Alasan pemberian akses wajib diisi.' using errcode = '22023';
    end if;

    if not exists (select 1 from public.profiles p where p.id = p_profile_id and p.is_active = true) then
        raise exception 'Pengguna tidak ditemukan atau tidak aktif.' using errcode = '22023';
    end if;

    select m.meeting_number, m.classification
      into v_meeting_number, v_classification
      from public.meetings m
     where m.id = p_meeting_id
       and m.status in ('Dijadwalkan', 'Berlangsung')
     for update;

    if not found then
        raise exception 'Rapat tidak ditemukan atau tidak dapat diubah.' using errcode = '23514';
    end if;

    if v_classification not in ('Internal', 'Rahasia') then
        raise exception 'Akses eksplisit hanya diperlukan untuk rapat Internal atau Rahasia.' using errcode = '23514';
    end if;

    insert into public.meeting_access (meeting_id, profile_id, reason, granted_by)
    values (p_meeting_id, p_profile_id, btrim(p_reason), (select auth.uid()))
    on conflict (meeting_id, profile_id)
    do update set reason = excluded.reason, granted_by = excluded.granted_by, granted_at = now();

    perform public.write_audit(
        'GRANT_ACCESS', 'meeting_access', v_meeting_number,
        'Memberikan akses eksplisit rapat',
        jsonb_build_object('meeting_id', p_meeting_id, 'profile_id', p_profile_id, 'reason', btrim(p_reason))
    );
end;
$function$;

create or replace function public.revoke_meeting_access(
    p_meeting_id uuid,
    p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_meeting_number text;
begin
    if not public.can_manage_meeting(p_meeting_id) then
        raise exception 'Anda tidak memiliki kewenangan mengatur akses rapat ini.' using errcode = '42501';
    end if;

    perform 1 from public.meetings
     where id = p_meeting_id
       and status in ('Dijadwalkan', 'Berlangsung')
     for update;
    if not found then
        raise exception 'Rapat tidak ditemukan atau tidak dapat diubah.' using errcode = '23514';
    end if;

    delete from public.meeting_access
     where meeting_id = p_meeting_id
       and profile_id = p_profile_id;

    if not found then
        raise exception 'Akses eksplisit tidak ditemukan.' using errcode = 'P0002';
    end if;

    select meeting_number into v_meeting_number from public.meetings where id = p_meeting_id;

    perform public.write_audit(
        'REVOKE_ACCESS', 'meeting_access', v_meeting_number,
        'Mencabut akses eksplisit rapat',
        jsonb_build_object('meeting_id', p_meeting_id, 'profile_id', p_profile_id)
    );
end;
$function$;

-- ---------------------------------------------------------
-- 8. FUNCTION EXECUTION PRIVILEGES
-- ---------------------------------------------------------

-- Internal helpers and number generator must not be callable
-- directly by client roles.
revoke all on function public.can_create_meeting_in_scope(uuid, uuid, uuid)
    from public, anon, authenticated;
revoke all on function public.can_manage_meeting(uuid)
    from public, anon, authenticated;
revoke all on function public.generate_meeting_number(uuid, uuid, timestamptz)
    from public, anon, authenticated;

-- User-facing RPCs: authenticated only.
revoke all on function public.create_meeting(
    text, text, uuid, uuid, uuid, text, timestamptz, timestamptz,
    text, text, text, uuid, uuid, text, text, uuid, integer
) from public, anon, authenticated;
grant execute on function public.create_meeting(
    text, text, uuid, uuid, uuid, text, timestamptz, timestamptz,
    text, text, text, uuid, uuid, text, text, uuid, integer
) to authenticated;

revoke all on function public.add_meeting_agenda(uuid, text, uuid, integer)
    from public, anon, authenticated;
grant execute on function public.add_meeting_agenda(uuid, text, uuid, integer)
    to authenticated;

revoke all on function public.update_meeting_agenda(uuid, text, uuid, integer)
    from public, anon, authenticated;
grant execute on function public.update_meeting_agenda(uuid, text, uuid, integer)
    to authenticated;

revoke all on function public.delete_meeting_agenda(uuid)
    from public, anon, authenticated;
grant execute on function public.delete_meeting_agenda(uuid)
    to authenticated;

revoke all on function public.add_meeting_participants(uuid, uuid[])
    from public, anon, authenticated;
grant execute on function public.add_meeting_participants(uuid, uuid[])
    to authenticated;

revoke all on function public.remove_meeting_participant(uuid, uuid)
    from public, anon, authenticated;
grant execute on function public.remove_meeting_participant(uuid, uuid)
    to authenticated;

revoke all on function public.update_meeting_attendance(uuid, uuid, text, text)
    from public, anon, authenticated;
grant execute on function public.update_meeting_attendance(uuid, uuid, text, text)
    to authenticated;

revoke all on function public.reschedule_meeting(uuid, timestamptz, timestamptz, text, text, text)
    from public, anon, authenticated;
grant execute on function public.reschedule_meeting(uuid, timestamptz, timestamptz, text, text, text)
    to authenticated;

revoke all on function public.cancel_meeting(uuid, text)
    from public, anon, authenticated;
grant execute on function public.cancel_meeting(uuid, text)
    to authenticated;

revoke all on function public.grant_meeting_access(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.grant_meeting_access(uuid, uuid, text) to authenticated;
revoke all on function public.revoke_meeting_access(uuid, uuid) from public, anon, authenticated;
grant execute on function public.revoke_meeting_access(uuid, uuid) to authenticated;

commit;
