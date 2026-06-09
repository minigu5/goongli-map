-- 궁리맵 (Science Map) — Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여넣어 실행하세요.
-- 재실행해도 안전하도록 작성했습니다.

-- ──────────────────────────────────────────────
-- 1. items 테이블 (실험 용품)
-- ──────────────────────────────────────────────
create table if not exists public.items (
  id              uuid primary key default gen_random_uuid(),
  name            text        not null,                 -- 이름 (필수)
  spec            text,                                  -- 규격 (선택)
  categories      text        not null default '',       -- 카테고리, 쉼표(,)로 구분 (검색용)
  subjects        text[]      not null,                  -- 과목: 물리/화학/생명/지구/공학 (1개 이상)
  building        text        not null,                  -- 'gungri' | 'geogyeong'
  floor           int         not null,                  -- 층 번호
  room            text,                                  -- 방 이름/위치 (선택)
  pos_x           double precision not null default 0.5, -- 핀 위치 X (0~1 상대좌표)
  pos_y           double precision not null default 0.5, -- 핀 위치 Y (0~1 상대좌표)
  image_url       text,                                  -- Cloudinary 이미지 URL
  image_public_id text,                                  -- Cloudinary public_id
  created_by      text,                                  -- 최초 작성자 이메일
  updated_by      text,                                  -- 마지막 수정자 이메일
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint items_building_check check (building in ('gungri', 'geogyeong')),
  constraint items_subjects_not_empty check (array_length(subjects, 1) >= 1),
  constraint items_pos_x_range check (pos_x >= 0 and pos_x <= 1),
  constraint items_pos_y_range check (pos_y >= 0 and pos_y <= 1)
);

-- 검색/필터 보조 인덱스
create index if not exists items_building_floor_idx on public.items (building, floor);
create index if not exists items_subjects_idx        on public.items using gin (subjects);

-- ──────────────────────────────────────────────
-- 2. updated_at 자동 갱신 트리거
-- ──────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists items_set_updated_at on public.items;
create trigger items_set_updated_at
  before update on public.items
  for each row
  execute function public.set_updated_at();

-- ──────────────────────────────────────────────
-- 3. Row Level Security (RLS)
--    - 열람(SELECT): 누구나 (로그인 불필요)
--    - 추가/수정/삭제: @ts.hs.kr 이메일로 로그인한 사용자만
-- ──────────────────────────────────────────────
alter table public.items enable row level security;

-- 학교 이메일 도메인 검사 헬퍼
create or replace function public.is_school_user()
returns boolean
language sql
stable
as $$
  select coalesce(auth.email() like '%@ts.hs.kr', false);
$$;

drop policy if exists "items_select_public" on public.items;
create policy "items_select_public"
  on public.items
  for select
  using (true);

drop policy if exists "items_insert_school" on public.items;
create policy "items_insert_school"
  on public.items
  for insert
  to authenticated
  with check (public.is_school_user());

drop policy if exists "items_update_school" on public.items;
create policy "items_update_school"
  on public.items
  for update
  to authenticated
  using (public.is_school_user())
  with check (public.is_school_user());

drop policy if exists "items_delete_school" on public.items;
create policy "items_delete_school"
  on public.items
  for delete
  to authenticated
  using (public.is_school_user());
