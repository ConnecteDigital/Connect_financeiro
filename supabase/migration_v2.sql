-- Migration v2: novos campos nos chamados

alter table calls
  add column if not exists contact_name text,
  add column if not exists scheduled_time time,
  add column if not exists service_category text,
  add column if not exists call_address text;
