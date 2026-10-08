alter table public.branches
    drop column address,
    drop column latitude,
    drop column longitude;

alter table public.branches
    add constraint branches_retailer_check
    check (retailer in ('rewe', 'lidl', 'aldi', 'edeka', 'norma', 'kaufland'));

drop index public.branches_retailer_address_unique;

create unique index branches_retailer_normalized_address_unique
    on public.branches (retailer, normalized_address);

alter table public.return_reports
    drop column return_method;

alter table public.return_reports
    drop constraint return_reports_outcome_check;

alter table public.return_reports
    add constraint return_reports_outcome_check
    check (outcome in ('accepted', 'rejected'));