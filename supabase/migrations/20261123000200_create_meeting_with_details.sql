
begin;

-- =========================================================
-- CREATE MEETING WITH DETAILS
-- Membuat rapat, seluruh agenda, dan peserta dalam satu
-- transaksi database melalui RPC yang sudah tersedia.
-- =========================================================

create or replace function public.create_meeting_with_details(
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
    p_first_agenda_duration_minutes integer,
    p_additional_agendas jsonb default '[]'::jsonb,
    p_participant_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_meeting_id uuid;
    v_agenda jsonb;
    v_topic text;
    v_owner_id uuid;
    v_duration_minutes integer;

begin
    if (select auth.uid()) is null
       or not public.is_session_valid() then
        raise exception 'Sesi tidak valid atau sudah berakhir.'
            using errcode = '42501';
    end if;

    -- Pastikan agenda tambahan berbentuk JSON array.
    -- Pastikan agenda tambahan berbentuk JSON array.
    if jsonb_typeof(p_additional_agendas) is distinct from 'array' then
        raise exception 'Format agenda tambahan tidak valid.'
            using errcode = '22023';
    end if;

    -- Pembuatan rapat dan agenda pertama.
    -- Fungsi ini sudah memvalidasi sesi, kewenangan,
    -- jenis rapat, jadwal, dan menulis audit log.
    v_meeting_id := public.create_meeting(
        p_title,
        p_meeting_type_id,
        p_org_node_id,
        p_department_node_id,
        p_division_node_id,
        p_classification,
        p_start_at,
        p_end_at,
        p_mode,
        p_location,
        p_meeting_link,
        p_leader_id,
        p_notetaker_id,
        p_purpose,
        p_first_agenda_topic,
        p_first_agenda_owner_id,
        p_first_agenda_duration_minutes
    );

    -- Tambahkan agenda kedua dan seterusnya.
    for v_agenda in
        select item.value
          from jsonb_array_elements(p_additional_agendas) as item(value)
    loop
        if jsonb_typeof(v_agenda) is distinct from 'object' then
            raise exception 'Format salah satu agenda tidak valid.'
                using errcode = '22023';
        end if;

        v_topic := nullif(btrim(v_agenda ->> 'topic'), '');

        if v_topic is null then
            raise exception 'Topik agenda tambahan wajib diisi.'
                using errcode = '22023';
        end if;

        v_owner_id :=
            nullif(btrim(v_agenda ->> 'owner_id'), '')::uuid;

        v_duration_minutes :=
            nullif(btrim(v_agenda ->> 'duration_minutes'), '')::integer;

        perform public.add_meeting_agenda(
            v_meeting_id,
            v_topic,
            v_owner_id,
            v_duration_minutes
        );
    end loop;

    -- Tambahkan peserta tambahan jika ada.
    -- Pimpinan dan notulis sudah otomatis ditambahkan
    -- oleh public.create_meeting().
    if coalesce(cardinality(p_participant_ids), 0) > 0 then
        perform public.add_meeting_participants(
            v_meeting_id,
            p_participant_ids
        );
    end if;

    return v_meeting_id;
end;
$function$;

-- Hanya authenticated yang boleh menjalankan RPC ini.
revoke all on function public.create_meeting_with_details(
    text, text, uuid, uuid, uuid, text, timestamptz, timestamptz,
    text, text, text, uuid, uuid, text, text, uuid, integer,
    jsonb, uuid[]
) from public, anon, authenticated;

grant execute on function public.create_meeting_with_details(
    text, text, uuid, uuid, uuid, text, timestamptz, timestamptz,
    text, text, text, uuid, uuid, text, text, uuid, integer,
    jsonb, uuid[]
) to authenticated;

commit;
