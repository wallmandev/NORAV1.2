-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 1. CLEANUP (För att fixa konflikter och saknade kolumner)
-- Droppa funktioner först för att undvika beroendefel
drop function if exists match_documents(vector, float, int, text);
drop function if exists match_documents(vector, float, int, uuid); -- Tar bort den gamla versionen som orsakade konflikt

-- Droppa tabeller om de har fel schema (OBS: Detta rensar datan!)
drop table if exists knowledge_base;
-- drop table if exists leads; -- Valfritt: avkommentera om du vill rensa leads också

-- 2. CREATE TABLES

-- Companies table (Stores company settings and valid API keys if needed)
create table if not exists companies (
  id text primary key,
  name text,
  branding_color text default '#7c3aed',
  bot_name text default 'NORA',
  welcome_message text default 'Hej! Vad kan jag hjälpa dig med idag?',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migrations for existing companies table
alter table companies add column if not exists branding_color text default '#7c3aed';
alter table companies add column if not exists bot_name text default 'NORA';
alter table companies add column if not exists welcome_message text default 'Hej! Vad kan jag hjälpa dig med idag?';
alter table companies add column if not exists logo_url text;

-- Store for RAG knowledge base
create table if not exists knowledge_base (
  id bigserial primary key,
  content text,
  metadata jsonb, -- Nu garanterar vi att denna skapas
  embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
  company_id text not null, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Captured leads from chat
create table if not exists leads (
  id bigserial primary key,
  company_id text not null,
  email text,
  phone text,
  name text,
  message text,
  contact_info jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure contact_info column exists (for migration of existing tables)
alter table leads add column if not exists contact_info jsonb;
alter table leads add column if not exists message text;
alter table leads add column if not exists phone text;
alter table leads alter column email drop not null; -- Make email optional since we might capture only phone numbers

-- 3. FUNCTIONS

-- Function to search documents
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_company_id text
) returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
) language plpgsql stable as $$
begin
  return query
  select
    knowledge_base.id,
    knowledge_base.content,
    knowledge_base.metadata,
    1 - (knowledge_base.embedding <=> query_embedding) as similarity
  from knowledge_base
  where 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  and knowledge_base.company_id = filter_company_id
  order by similarity desc
  limit match_count;
end;
$$;

-- 4. TRIGGERS (Automatiskt skapa company när en användare registrerar sig)
-- Denna funktion körs varje gång en ny användare skapas i auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.companies (id, name)
  values (new.id, new.email); -- Vi sätter namnet till email som startvärde
  return new;
end;
$$ language plpgsql security definer;

-- Skapa triggern
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create indexes for better performance
create index if not exists kb_embedding_idx on knowledge_base using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- STORAGE SETUP (For company logos)
-- Note: This requires the storage schema to be active in Supabase.
insert into storage.buckets (id, name, public) 
values ('company_logos', 'company_logos', true)
on conflict (id) do nothing;

-- Storage Policies
create policy "Public Access to Logos"
on storage.objects for select
to public
using ( bucket_id = 'company_logos' );

create policy "Companies can upload their own logo"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'company_logos' AND (storage.foldername(name))[1] = auth.uid()::text );

create policy "Companies can update their own logo"
on storage.objects for update
to authenticated
using ( bucket_id = 'company_logos' AND (storage.foldername(name))[1] = auth.uid()::text );
