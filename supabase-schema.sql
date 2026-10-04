create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  price integer not null check (price >= 0),
  compare_price integer,
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  image_url text not null default '',
  gallery jsonb not null default '[]'::jsonb,
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  carrier text not null check (carrier in ('nova', 'ukr')),
  city text,
  warehouse text,
  address text,
  items jsonb not null,
  total integer not null check (total >= 0),
  status text not null default 'new',
  source text,
  campaign text,
  created_at timestamptz not null default now()
);

create index if not exists products_active_sort_idx on public.products(active, sort_order);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists orders_created_idx on public.orders(created_at desc);

insert into public.categories (name, slug, sort_order)
values ('Автодопомога', 'auto-help', 10)
on conflict (slug) do nothing;

insert into public.products (
  name, slug, price, description, category_id, image_url, gallery, stock, active, sort_order
)
select
  'DRIVEKIT GL-965A 4-в-1',
  'drivekit-gl-965a',
  2190,
  'Пускозарядний пристрій, компресор до 150 PSI, Power Bank та LED-ліхтар.',
  categories.id,
  'https://drops.in.ua/img/p/132259953/0.webp',
  '["https://drops.in.ua/img/p/132259953/0.webp","https://drops.in.ua/img/p/132259953/1.webp","https://drops.in.ua/img/p/132259953/2.webp"]'::jsonb,
  20,
  true,
  10
from public.categories
where categories.slug = 'auto-help'
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Browser clients never access these tables directly. Vercel Functions use the service-role key.
