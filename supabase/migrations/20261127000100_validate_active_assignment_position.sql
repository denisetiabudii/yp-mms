-- Validasi unit dan jabatan aktif untuk penugasan baru
-- atau perubahan unit/jabatan.
-- Penugasan lama tetap dipertahankan saat status jabatan dinonaktifkan.

create or replace function public.user_assignments_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.org_nodes n
    where n.id = new.org_node_id
      and n.is_active
  ) then
    raise exception 'Tidak dapat menugaskan ke unit/departemen yang nonaktif.';
  end if;

  if not exists (
    select 1
    from public.positions p
    where p.id = new.position_id
      and p.is_active
  ) then
    raise exception 'Jabatan tidak ditemukan atau sudah nonaktif.';
  end if;

  return new;
end;
$$;

-- Ganti event trigger agar UPDATE pada kolom penugasan juga tervalidasi.
drop trigger if exists user_assignments_guard on public.user_assignments;

create trigger user_assignments_guard
  before insert or update of org_node_id, position_id
  on public.user_assignments
  for each row
  execute function public.user_assignments_guard();
