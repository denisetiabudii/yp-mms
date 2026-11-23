
begin;

-- =========================================================
-- 1. MASTER DATA JENIS RAPAT
-- =========================================================

create table public.meeting_types (
    id text primary key,
    name text not null,
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    constraint meeting_types_id_format
        check (id ~ '^[a-z][a-z0-9_-]{1,49}$'),
    constraint meeting_types_name_not_empty
        check (length(trim(name)) > 0)
);

insert into public.meeting_types (id, name, sort_order)
values
    ('rutin', 'Rapat Rutin', 1),
    ('koordinasi', 'Rapat Koordinasi', 2),
    ('evaluasi', 'Rapat Evaluasi', 3),
    ('keputusan', 'Rapat Pengambilan Keputusan', 4),
    ('khusus', 'Rapat Khusus', 5);


-- =========================================================
-- 2. TABEL RAPAT
-- =========================================================

create table public.meetings (
    id uuid primary key default gen_random_uuid(),

    meeting_number text not null unique,
    title text not null,
    purpose text,

    meeting_type_id text not null
        references public.meeting_types(id),

    org_node_id uuid not null
    references public.org_nodes(id) on delete restrict,

    department_node_id uuid
        references public.org_nodes(id),

    classification text not null default 'Umum'
        check (classification in ('Umum', 'Internal', 'Rahasia')),

    status text not null default 'Dijadwalkan'
        check (status in (
            'Dijadwalkan',
            'Berlangsung',
            'Selesai',
            'Dibatalkan'
        )),

    meeting_date date not null,
    start_at timestamptz not null,
    end_at timestamptz not null,

    mode text not null
        check (mode in ('Luring', 'Daring', 'Hibrida')),

    location text,
    meeting_link text,

    leader_id uuid not null
        references public.profiles(id),

    notetaker_id uuid
        references public.profiles(id),

    created_by uuid not null
        references public.profiles(id),

    cancellation_reason text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint meetings_title_not_empty
        check (length(trim(title)) > 0),

    constraint meetings_number_not_empty
        check (length(trim(meeting_number)) > 0),

    constraint meetings_time_order
        check (end_at > start_at),

    constraint meetings_jakarta_date
        check (
            meeting_date = (start_at at time zone 'Asia/Jakarta')::date
        ),

    constraint meetings_location_or_link
        check (
            (mode = 'Luring' and location is not null
                and length(trim(location)) > 0)
            or
            (mode = 'Daring' and meeting_link is not null
                and length(trim(meeting_link)) > 0)
            or
            (mode = 'Hibrida' and location is not null
                and length(trim(location)) > 0
                and meeting_link is not null
                and length(trim(meeting_link)) > 0)
        ),

    constraint meetings_cancellation_reason
        check (
            status <> 'Dibatalkan'
            or (
                cancellation_reason is not null
                and length(trim(cancellation_reason)) > 0
            )
        )
);

create index meetings_org_node_idx
    on public.meetings(org_node_id);

create index meetings_department_node_idx
    on public.meetings(department_node_id);

create index meetings_date_idx
    on public.meetings(meeting_date);

create index meetings_status_idx
    on public.meetings(status);

create index meetings_leader_idx
    on public.meetings(leader_id);

create index meetings_notetaker_idx
    on public.meetings(notetaker_id);


-- =========================================================
-- 3. VALIDASI DATA RAPAT
-- =========================================================

create or replace function public.meetings_validate()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
    v_unit_kind public.org_kind;
    v_unit_active boolean;
    v_department_kind public.org_kind;
    v_department_parent uuid;
    v_department_active boolean;
begin
    if tg_op = 'INSERT'
       or new.org_node_id is distinct from old.org_node_id
       or new.department_node_id is distinct from old.department_node_id
    then
        select n.kind, n.is_active
          into v_unit_kind, v_unit_active
          from public.org_nodes n
         where n.id = new.org_node_id;

        if not found
           or v_unit_kind <> 'unit'
           or not v_unit_active
        then
            raise exception 'Unit rapat tidak valid atau tidak aktif.';
        end if;

        if new.department_node_id is not null then
            select n.kind, n.parent_id, n.is_active
              into v_department_kind, v_department_parent,
                   v_department_active
              from public.org_nodes n
             where n.id = new.department_node_id;

            if not found
               or v_department_kind <> 'departemen'
               or v_department_parent <> new.org_node_id
               or not v_department_active
            then
                raise exception
                    'Departemen harus aktif dan berada di bawah unit rapat.';
            end if;
        end if;
    end if;

    if tg_op = 'INSERT'
       or new.leader_id is distinct from old.leader_id
    then
        if not exists (
            select 1 from public.profiles p
             where p.id = new.leader_id
               and p.is_active = true
        ) then
            raise exception 'Pimpinan rapat tidak aktif atau tidak ditemukan.';
        end if;
    end if;

    if new.notetaker_id is not null
       and (
           tg_op = 'INSERT'
           or new.notetaker_id is distinct from old.notetaker_id
       )
    then
        if not exists (
            select 1 from public.profiles p
             where p.id = new.notetaker_id
               and p.is_active = true
        ) then
            raise exception 'Notulis tidak aktif atau tidak ditemukan.';
        end if;
    end if;

    if tg_op = 'INSERT' then
        if not exists (
            select 1 from public.profiles p
             where p.id = new.created_by
               and p.is_active = true
        ) then
            raise exception 'Pembuat rapat tidak aktif atau tidak ditemukan.';
        end if;
    end if;

    new.updated_at = now();
    return new;
end;
$function$;

create trigger meetings_validate_trigger
before insert or update on public.meetings
for each row execute function public.meetings_validate();


-- =========================================================
-- 4. PESERTA RAPAT
-- =========================================================

create table public.meeting_participants (
    id uuid primary key default gen_random_uuid(),

    meeting_id uuid not null
        references public.meetings(id) on delete restrict,

    profile_id uuid not null
        references public.profiles(id) on delete restrict,

    attendance_status text not null default 'Belum konfirmasi'
        check (attendance_status in (
            'Belum konfirmasi',
            'Hadir',
            'Online',
            'Terlambat',
            'Izin',
            'Sakit',
            'Tidak hadir'
        )),

    note text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint meeting_participants_unique
        unique (meeting_id, profile_id)
);

create index meeting_participants_profile_idx
    on public.meeting_participants(profile_id);

create index meeting_participants_meeting_idx
    on public.meeting_participants(meeting_id);


create or replace function public.meeting_participants_validate()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
    if tg_op = 'INSERT'
       or new.profile_id is distinct from old.profile_id
    then
        if not exists (
            select 1 from public.profiles p
             where p.id = new.profile_id
               and p.is_active = true
        ) then
            raise exception 'Peserta tidak aktif atau tidak ditemukan.';
        end if;
    end if;

    new.updated_at = now();
    return new;
end;
$function$;

create trigger meeting_participants_validate_trigger
before insert or update on public.meeting_participants
for each row execute function public.meeting_participants_validate();


-- =========================================================
-- 5. AGENDA RAPAT
-- =========================================================

create table public.meeting_agendas (
    id uuid primary key default gen_random_uuid(),

    meeting_id uuid not null
        references public.meetings(id) on delete restrict,

    agenda_order integer not null,
    topic text not null,
owner_id uuid
    references public.profiles(id) on delete restrict,

    duration_minutes integer,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint meeting_agendas_order_positive
        check (agenda_order > 0),

    constraint meeting_agendas_topic_not_empty
        check (length(trim(topic)) > 0),

    constraint meeting_agendas_duration_positive
        check (duration_minutes is null or duration_minutes > 0),

    constraint meeting_agendas_unique_order
        unique (meeting_id, agenda_order)
);

create index meeting_agendas_meeting_idx
    on public.meeting_agendas(meeting_id);
    -- Validasi pemilik agenda dan updated_at.
create or replace function public.meeting_agendas_validate()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
    if tg_op = 'INSERT' then
        if new.owner_id is not null
           and not exists (
               select 1
               from public.profiles p
               where p.id = new.owner_id
                 and p.is_active = true
           )
        then
            raise exception 'Pemilik agenda tidak aktif atau tidak ditemukan.';
        end if;

    elsif new.owner_id is distinct from old.owner_id then
        if new.owner_id is not null
           and not exists (
               select 1
               from public.profiles p
               where p.id = new.owner_id
                 and p.is_active = true
           )
        then
            raise exception 'Pemilik agenda tidak aktif atau tidak ditemukan.';
        end if;
    end if;

    new.updated_at = now();
    return new;
end;
$function$;

create trigger meeting_agendas_validate_trigger
before insert or update on public.meeting_agendas
for each row execute function public.meeting_agendas_validate();


-- =========================================================
-- 6. AKSES EKSPILISIT RAPAT
-- =========================================================

create table public.meeting_access (
    id uuid primary key default gen_random_uuid(),

    meeting_id uuid not null
        references public.meetings(id) on delete restrict,

    profile_id uuid not null
        references public.profiles(id) on delete restrict,

    reason text not null,

    granted_by uuid not null
    references public.profiles(id) on delete restrict,

    granted_at timestamptz not null default now(),

    constraint meeting_access_reason_not_empty
        check (length(trim(reason)) > 0),

    constraint meeting_access_unique
        unique (meeting_id, profile_id)
);

create index meeting_access_profile_idx
    on public.meeting_access(profile_id);

create index meeting_access_meeting_idx
    on public.meeting_access(meeting_id);
    -- Validasi penerima dan pemberi akses eksplisit.
create or replace function public.meeting_access_validate()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
    if tg_op = 'INSERT' then
        if not exists (
            select 1
            from public.profiles p
            where p.id = new.profile_id
              and p.is_active = true
        ) then
            raise exception 'Penerima akses tidak aktif atau tidak ditemukan.';
        end if;

        if not exists (
            select 1
            from public.profiles p
            where p.id = new.granted_by
              and p.is_active = true
        ) then
            raise exception 'Pemberi akses tidak aktif atau tidak ditemukan.';
        end if;

    else
        if new.profile_id is distinct from old.profile_id
           and not exists (
               select 1
               from public.profiles p
               where p.id = new.profile_id
                 and p.is_active = true
           )
        then
            raise exception 'Penerima akses tidak aktif atau tidak ditemukan.';
        end if;

        if new.granted_by is distinct from old.granted_by
           and not exists (
               select 1
               from public.profiles p
               where p.id = new.granted_by
                 and p.is_active = true
           )
        then
            raise exception 'Pemberi akses tidak aktif atau tidak ditemukan.';
        end if;
    end if;

    return new;
end;
$function$;

create trigger meeting_access_validate_trigger
before insert or update on public.meeting_access
for each row execute function public.meeting_access_validate();


-- =========================================================
-- 7. COUNTER NOMOR RAPAT
-- =========================================================

create table public.meeting_number_counters (
    org_node_id uuid not null
    references public.org_nodes(id) on delete restrict,

    counter_year integer not null,

    last_value integer not null default 0,

    updated_at timestamptz not null default now(),

    primary key (org_node_id, counter_year),

    constraint meeting_number_counter_year
        check (counter_year between 2000 and 9999),

    constraint meeting_number_counter_value
        check (last_value >= 0)
);

create trigger meeting_number_counters_updated_at
before update on public.meeting_number_counters
for each row execute function public.set_updated_at();
-- =========================================================
-- 8. FUNGSI PEMERIKSAAN AKSES RAPAT
-- =========================================================


create or replace function public.can_view_meeting(p_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
    select coalesce((
        with recursive
        target as (
            select
                m.id,
                m.org_node_id,
                m.department_node_id,
                m.classification
            from public.meetings m
            where m.id = p_meeting_id
        ),

        -- Unit dan seluruh induknya: termasuk Grup.
        unit_ancestors(id, parent_id) as (
            select n.id, n.parent_id
            from public.org_nodes n
            join target t on t.org_node_id = n.id

            union all

            select p.id, p.parent_id
            from public.org_nodes p
            join unit_ancestors a on p.id = a.parent_id
        ),

        -- Unit dan seluruh turunannya.
        unit_descendants(id) as (
            select n.id
            from public.org_nodes n
            join target t on t.org_node_id = n.id

            union all

            select child.id
            from public.org_nodes child
            join unit_descendants d on child.parent_id = d.id
        ),

        -- Departemen rapat dan seluruh turunannya.
        department_descendants(id) as (
            select n.id
            from public.org_nodes n
            join target t on t.department_node_id = n.id

            union all

            select child.id
            from public.org_nodes child
            join department_descendants d
                on child.parent_id = d.id
        ),

        scopes as (
            select
                -- Umum: Grup, unit, dan seluruh node di bawah unit.
                exists (
                    select 1
                    from public.user_assignments ua
                    where ua.user_id = (select auth.uid())
                    and exists (
    select 1
    from public.org_nodes active_node
    where active_node.id = ua.org_node_id
      and active_node.is_active = true
)
                      and (
                          ua.org_node_id in (
                              select id from unit_ancestors
                          )
                          or ua.org_node_id in (
                              select id from unit_descendants
                          )
                      )
                ) as in_unit_scope,

                -- Internal: kewenangan dalam lingkup rapat.
                -- Assignment Grup tidak otomatis mendapat akses.
                exists (
                    select 1
                    from public.user_assignments ua
                    cross join target t
                    where ua.user_id = (select auth.uid())
                    and exists (
    select 1
    from public.org_nodes active_node
    where active_node.id = ua.org_node_id
      and active_node.is_active = true
)
                      and (
                          ua.org_node_id = t.org_node_id
                          or (
                              t.department_node_id is null
                              and ua.org_node_id in (
                                  select id from unit_descendants
                              )
                          )
                          or (
                              t.department_node_id is not null
                              and ua.org_node_id in (
                                  select id from department_descendants
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
                            select 1
                            from public.meeting_participants mp
                            where mp.meeting_id = t.id
                              and mp.profile_id = (select auth.uid())
                        )
                        or exists (
                            select 1
                            from public.meeting_access ma
                            where ma.meeting_id = t.id
                              and ma.profile_id = (select auth.uid())
                        )
                    )
                )
                or (
                    t.classification = 'Rahasia'
                    and (
                        exists (
                            select 1
                            from public.meeting_participants mp
                            where mp.meeting_id = t.id
                              and mp.profile_id = (select auth.uid())
                        )
                        or exists (
                            select 1
                            from public.meeting_access ma
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

-- Batasi eksekusi fungsi pemeriksaan akses.
revoke all on function public.can_view_meeting(uuid)
    from public, anon;

grant execute on function public.can_view_meeting(uuid)
    to authenticated;


-- =========================================================
-- 9. AKTIFKAN ROW LEVEL SECURITY
-- =========================================================

alter table public.meeting_types enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.meeting_agendas enable row level security;
alter table public.meeting_access enable row level security;
alter table public.meeting_number_counters enable row level security;


-- =========================================================
-- 10. POLICIES SELECT
-- =========================================================

create policy meeting_types_select
on public.meeting_types
for select
to authenticated
using (
    public.is_session_valid()
    and is_active = true
);

create policy meetings_select
on public.meetings
for select
to authenticated
using (
    public.can_view_meeting(id)
);

create policy meeting_participants_select
on public.meeting_participants
for select
to authenticated
using (
    public.can_view_meeting(meeting_id)
);

create policy meeting_agendas_select
on public.meeting_agendas
for select
to authenticated
using (
    public.can_view_meeting(meeting_id)
);

create policy meeting_access_select
on public.meeting_access
for select
to authenticated
using (
    public.is_session_valid()
    and (
        profile_id = (select auth.uid())
        or public.is_super_admin()
        or (
            granted_by = (select auth.uid())
            and public.can_view_meeting(meeting_id)
        )
    )
);


-- =========================================================
-- 11. PRIVILEGE DATABASE
-- Semua operasi tulis akan melalui RPC terotorisasi
-- pada migration berikutnya.
-- =========================================================

revoke all on public.meeting_types
    from public, anon, authenticated;

revoke all on public.meetings
    from public, anon, authenticated;

revoke all on public.meeting_participants
    from public, anon, authenticated;

revoke all on public.meeting_agendas
    from public, anon, authenticated;

revoke all on public.meeting_access
    from public, anon, authenticated;

revoke all on public.meeting_number_counters
    from public, anon, authenticated;

grant select on public.meeting_types
    to authenticated;

grant select on public.meetings
    to authenticated;

grant select on public.meeting_participants
    to authenticated;

grant select on public.meeting_agendas
    to authenticated;

grant select on public.meeting_access
    to authenticated;

commit;
