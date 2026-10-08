create extension if not exists pgcrypto;

create table public.branches (
    id uuid primary key default gen_random_uuid(),
    retailer text not null,
    address text not null,
    normalized_address text not null,
    latitude double precision,
    longitude double precision,
    created_at timestamptz not null default now()
);

create unique index branches_retailer_address_unique
    on public.branches (lower(retailer), normalized_address);

create table public.return_reports (
    id uuid primary key default gen_random_uuid(),
    request_id uuid not null unique,
    barcode text not null,
    branch_id uuid not null references public.branches(id),
    outcome text not null
        check (outcome in ('accepted', 'rejected', 'unable_to_test')),
    return_method text not null
        check (return_method in ('machine', 'staff')),
    observed_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index return_reports_lookup
    on public.return_reports (barcode, branch_id, observed_at desc);

alter table public.branches enable row level security;
alter table public.return_reports enable row level security;

revoke all on public.branches, public.return_reports
    from anon, authenticated;

grant all on public.branches, public.return_reports to service_role;
