-- Ejecutar en el SQL Editor de Supabase (una sola vez)

create table if not exists games (
  id    text primary key,
  name  text not null,
  meta  text default '',
  rules text default '',
  setup text default '',
  notes text default '',
  cats  jsonb default '[]',
  image text default ''
);

create table if not exists matches (
  id      text primary key,
  game_id text not null,
  date    text,
  players jsonb not null default '[]',
  photo   text default null
);

create table if not exists players (
  name text primary key
);

create table if not exists settings (
  key   text primary key,
  value text
);
