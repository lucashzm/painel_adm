-- Chat BM: conversas independentes do cadastro de clientes, mensagens e mídia privada.
-- A entrada de clientes pelo Catálogo será habilitada em etapa própria, com RPC/token de acesso.

create table public.chat_conversas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid null references public.clientes(id) on delete set null,
  nome_cliente text not null,
  telefone text not null,
  status text not null default 'aguardando'
    check (status in ('aguardando','em_atendimento','inativa','encerrada')),
  atendente_id uuid null references public.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  ultima_atividade_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '15 minutes'),
  encerrado_em timestamptz null,
  constraint chat_conversas_encerramento_check
    check ((status = 'encerrada' and encerrado_em is not null) or status <> 'encerrada')
);
create index chat_conversas_status_atividade_idx on public.chat_conversas (status, ultima_atividade_em desc);
create index chat_conversas_telefone_idx on public.chat_conversas (telefone, criado_em desc);
create index chat_conversas_atendente_idx on public.chat_conversas (atendente_id, status);

create table public.chat_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.chat_conversas(id) on delete cascade,
  remetente_tipo text not null check (remetente_tipo in ('cliente','atendente','sistema')),
  remetente_id uuid null references public.users(id) on delete set null,
  tipo text not null default 'texto' check (tipo in ('texto','imagem','audio')),
  mensagem text null,
  arquivo_path text null,
  mime_type text null,
  tamanho_bytes bigint null check (tamanho_bytes is null or tamanho_bytes >= 0),
  duracao_segundos numeric(8,2) null check (duracao_segundos is null or duracao_segundos >= 0),
  criado_em timestamptz not null default now(),
  lida_em timestamptz null,
  constraint chat_mensagens_conteudo_check check (
    (tipo = 'texto' and mensagem is not null and arquivo_path is null)
    or (tipo in ('imagem','audio') and arquivo_path is not null)
  ),
  constraint chat_mensagens_remetente_check check (
    (remetente_tipo = 'atendente' and remetente_id is not null)
    or (remetente_tipo in ('cliente','sistema') and remetente_id is null)
  )
);
create index chat_mensagens_conversa_data_idx on public.chat_mensagens (conversa_id, criado_em asc);

alter table public.chat_conversas enable row level security;
alter table public.chat_mensagens enable row level security;
grant select, update on public.chat_conversas to authenticated;
grant select, insert on public.chat_mensagens to authenticated;

create policy chat_conversas_staff_select on public.chat_conversas for select to authenticated
using (exists (select 1 from public.users u where u.auth_user_id = (select auth.uid()) and u.ativo is distinct from false));
create policy chat_conversas_staff_update on public.chat_conversas for update to authenticated
using (exists (
  select 1 from public.users u where u.auth_user_id = (select auth.uid()) and u.ativo is distinct from false
  and (u.cargo = 'administrador' or chat_conversas.atendente_id is null or chat_conversas.atendente_id = u.id)
))
with check (exists (
  select 1 from public.users u where u.auth_user_id = (select auth.uid()) and u.ativo is distinct from false
  and (u.cargo = 'administrador' or chat_conversas.atendente_id is null or chat_conversas.atendente_id = u.id)
));

create policy chat_mensagens_staff_select on public.chat_mensagens for select to authenticated
using (exists (
  select 1 from public.chat_conversas c join public.users u on u.auth_user_id = (select auth.uid())
  where c.id = chat_mensagens.conversa_id and u.ativo is distinct from false
));
create policy chat_mensagens_staff_insert on public.chat_mensagens for insert to authenticated
with check (
  remetente_tipo = 'atendente' and exists (
    select 1 from public.chat_conversas c join public.users u on u.auth_user_id = (select auth.uid())
    where c.id = chat_mensagens.conversa_id and u.ativo is distinct from false
      and chat_mensagens.remetente_id = u.id
      and (c.atendente_id = u.id or u.cargo = 'administrador')
  )
);

create or replace function public.chat_registrar_atividade()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.chat_conversas
  set ultima_atividade_em = new.criado_em, expira_em = new.criado_em + interval '15 minutes'
  where id = new.conversa_id and status <> 'encerrada';
  return new;
end;
$$;
revoke all on function public.chat_registrar_atividade() from public, anon, authenticated;
create trigger chat_mensagem_atualiza_atividade after insert on public.chat_mensagens
for each row execute function public.chat_registrar_atividade();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-midias','chat-midias',false,15728640,array[
'image/jpeg','image/png','image/webp','image/heic','image/heif',
'audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/aac','audio/wav','audio/x-wav'
]) on conflict (id) do nothing;
grant select, insert, delete on storage.objects to authenticated;

create policy chat_midias_staff_select on storage.objects for select to authenticated
using (bucket_id = 'chat-midias' and exists (
  select 1 from public.chat_conversas c join public.users u on u.auth_user_id = (select auth.uid())
  where c.id::text = (storage.foldername(name))[1] and u.ativo is distinct from false
));
create policy chat_midias_staff_insert on storage.objects for insert to authenticated
with check (bucket_id = 'chat-midias' and exists (
  select 1 from public.chat_conversas c join public.users u on u.auth_user_id = (select auth.uid())
  where c.id::text = (storage.foldername(name))[1] and u.ativo is distinct from false
    and (c.atendente_id = u.id or u.cargo = 'administrador')
));
create policy chat_midias_staff_delete on storage.objects for delete to authenticated
using (bucket_id = 'chat-midias' and exists (
  select 1 from public.chat_conversas c join public.users u on u.auth_user_id = (select auth.uid())
  where c.id::text = (storage.foldername(name))[1] and u.ativo is distinct from false
    and (c.atendente_id = u.id or u.cargo = 'administrador')
));

alter publication supabase_realtime add table public.chat_conversas;
alter publication supabase_realtime add table public.chat_mensagens;
