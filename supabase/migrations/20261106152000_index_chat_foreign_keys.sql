-- Indexes covering chat foreign keys flagged by the Supabase performance advisor.
create index if not exists chat_conversas_cliente_id_idx on public.chat_conversas (cliente_id);
create index if not exists chat_mensagens_remetente_id_idx on public.chat_mensagens (remetente_id);
