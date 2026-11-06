(() => {
  const chatDb = supabase.createClient(
    'https://hpjiwmmslyvuqrkllmvb.supabase.co',
    'sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx'
  );
  const $ = (id) => document.getElementById(id);
  const state = {
    user: null, staff: null, conversations: [], selected: null,
    messageChannel: null, listChannel: null, pendingFile: null,
    recorder: null, recorderStream: null, audioChunks: [], recordingStarted: 0,
    recordingTimer: null, recordingDuration: 0
  };
  const allowedImageTypes = ['image/jpeg','image/png','image/webp','image/heic','image/heif'];
  const allowedAudioTypes = ['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/aac','audio/wav','audio/x-wav'];
  const maxFileSize = 15 * 1024 * 1024;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function formatTime(value) {
    return new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(value));
  }
  function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(seconds || 0));
    return String(Math.floor(total / 60)).padStart(2,'0') + ':' + String(total % 60).padStart(2,'0');
  }
  function conversationStatus(conversation) {
    if (conversation.status !== 'encerrada' && conversation.expira_em && new Date(conversation.expira_em) <= new Date()) return 'inativa';
    return conversation.status;
  }
  function statusLabel(status) {
    return ({aguardando:'Aguardando',em_atendimento:'Em atendimento',inativa:'Inativa',encerrada:'Encerrada'})[status] || status;
  }
  function showNotice(message, error = false) {
    const el = $('avisoChat');
    el.textContent = message;
    el.hidden = false;
    el.classList.toggle('erro', error);
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => { el.hidden = true; }, 5000);
  }
  function canReply() {
    return !!state.selected && !!state.staff &&
      (state.staff.cargo === 'administrador' || state.selected.atendente_id === state.staff.id);
  }
  function setComposerEnabled(enabled) {
    ['btnCamera','btnGaleria','btnAudio','inputMensagem','btnEnviar'].forEach(id => { $(id).disabled = !enabled; });
  }
  function updateChatHeader() {
    const c = state.selected;
    $('chatNome').textContent = c ? c.nome_cliente : 'Atendimento BM Móveis';
    $('chatTelefone').textContent = c ? c.telefone : 'Selecione uma conversa';
    $('chatAvatar').textContent = c ? (c.nome_cliente || 'C').trim().slice(0,1).toUpperCase() : 'BM';
    $('chatStatus').textContent = c ? statusLabel(conversationStatus(c)) : 'Aguardando seleção';
    $('btnAssumir').hidden = !c || canReply();
    $('btnAssumir').disabled = !c || (c.atendente_id && c.atendente_id !== state.staff.id && state.staff.cargo !== 'administrador');
    $('btnAssumir').textContent = c && c.atendente_id ? 'Em atendimento' : 'Assumir atendimento';
    $('btnEncerrar').hidden = !c || c.status === 'encerrada';
    $('btnEncerrar').disabled = !c || !canReply();
    setComposerEnabled(canReply() && c.status !== 'encerrada');
  }
  function renderConversationList() {
    const query = $('buscaConversas').value.trim().toLocaleLowerCase('pt-BR');
    const filter = $('filtroConversas').value;
    const rows = state.conversations.filter(c => {
      const status = conversationStatus(c);
      const matchesText = !query || (c.nome_cliente + ' ' + c.telefone).toLocaleLowerCase('pt-BR').includes(query);
      return matchesText && (filter === 'todas' || filter === status);
    });
    $('contadorConversas').textContent = state.conversations.length + (state.conversations.length === 1 ? ' conversa' : ' conversas');
    $('totalLista').textContent = rows.length;
    const list = $('listaConversas');
    list.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'conversas-lista-vazia';
      empty.innerHTML = '<strong>Nenhuma conversa encontrada</strong><p>Quando houver atendimentos, eles aparecerão nesta lista.</p>';
      list.appendChild(empty);
      return;
    }
    rows.forEach(c => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'conversa-item' + (state.selected?.id === c.id ? ' selecionada' : '');
      const last = c.ultima_mensagem || 'Inicie o atendimento';
      item.innerHTML = '<span class="conversa-item-avatar">' + escapeHtml((c.nome_cliente || 'C').trim().slice(0,1).toUpperCase()) + '</span>' +
        '<span class="conversa-item-conteudo"><span class="conversa-item-linha"><strong>' + escapeHtml(c.nome_cliente) + '</strong><time>' + formatTime(c.ultima_atividade_em) + '</time></span>' +
        '<span class="conversa-item-previa">' + escapeHtml(last) + '</span><span class="conversa-item-status status-' + conversationStatus(c) + '">' + statusLabel(conversationStatus(c)) + '</span></span>';
      item.addEventListener('click', () => selectConversation(c.id));
      list.appendChild(item);
    });
  }
  async function loadConversations() {
    const { data, error } = await chatDb.from('chat_conversas')
      .select('id,nome_cliente,telefone,status,atendente_id,criado_em,ultima_atividade_em,expira_em,encerrado_em')
      .order('ultima_atividade_em',{ascending:false}).limit(150);
    if (error) throw error;
    const conversations = data || [];
    const ids = conversations.map(c => c.id);
    if (ids.length) {
      const { data: latest, error: latestError } = await chatDb.from('chat_mensagens')
        .select('conversa_id,tipo,mensagem,criado_em').in('conversa_id',ids)
        .order('criado_em',{ascending:false});
      if (!latestError) {
        const seen = new Set();
        (latest || []).forEach(m => {
          if (seen.has(m.conversa_id)) return;
          seen.add(m.conversa_id);
          const c = conversations.find(item => item.id === m.conversa_id);
          if (c) c.ultima_mensagem = m.tipo === 'texto' ? m.mensagem : (m.tipo === 'imagem' ? 'Foto' : 'Áudio');
        });
      }
    }
    state.conversations = conversations;
    if (state.selected) state.selected = conversations.find(c => c.id === state.selected.id) || state.selected;
    renderConversationList();
    updateChatHeader();
  }
  async function signedMedia(path) {
    const { data, error } = await chatDb.storage.from('chat-midias').createSignedUrl(path,3600);
    if (error) throw error;
    return data.signedUrl;
  }
  async function renderMessages() {
    const c = state.selected;
    if (!c) return;
    const box = $('mensagensChat');
    const { data, error } = await chatDb.from('chat_mensagens')
      .select('id,conversa_id,remetente_tipo,remetente_id,tipo,mensagem,arquivo_path,mime_type,duracao_segundos,criado_em')
      .eq('conversa_id',c.id).order('criado_em',{ascending:true}).limit(500);
    if (error) throw error;
    box.replaceChildren();
    for (const m of (data || [])) {
      const bubble = document.createElement('article');
      bubble.className = 'mensagem-balao ' + (m.remetente_tipo === 'atendente' ? 'mensagem-enviada' : 'mensagem-recebida');
      if (m.tipo === 'texto') {
        const text = document.createElement('p');
        text.textContent = m.mensagem || '';
        bubble.appendChild(text);
      } else {
        try {
          const url = await signedMedia(m.arquivo_path);
          if (m.tipo === 'imagem') {
            const link = document.createElement('a');
            link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
            const img = document.createElement('img');
            img.src = url; img.alt = 'Imagem enviada na conversa'; img.loading = 'lazy';
            link.appendChild(img); bubble.appendChild(link);
          } else {
            const audio = document.createElement('audio');
            audio.controls = true; audio.preload = 'metadata'; audio.src = url;
            bubble.appendChild(audio);
            if (m.duracao_segundos) {
              const duration = document.createElement('small');
              duration.textContent = formatDuration(m.duracao_segundos);
              bubble.appendChild(duration);
            }
          }
        } catch (mediaError) {
          const unavailable = document.createElement('p');
          unavailable.textContent = 'Não foi possível carregar esta mídia.';
          bubble.appendChild(unavailable);
        }
      }
      if (m.mensagem && m.tipo !== 'texto') {
        const caption = document.createElement('p'); caption.className = 'mensagem-legenda'; caption.textContent = m.mensagem; bubble.appendChild(caption);
      }
      const meta = document.createElement('time');
      meta.textContent = formatTime(m.criado_em);
      bubble.appendChild(meta);
      box.appendChild(bubble);
    }
    $('chatVazio').hidden = true;
    box.hidden = false;
    box.scrollTop = box.scrollHeight;
  }
  function stopMessageSubscription() {
    if (state.messageChannel) chatDb.removeChannel(state.messageChannel);
    state.messageChannel = null;
  }
  async function selectConversation(id) {
    const c = state.conversations.find(item => item.id === id);
    if (!c) return;
    state.selected = c;
    $('workspaceConversas').classList.add('conversa-aberta');
    updateChatHeader();
    renderConversationList();
    $('chatVazio').hidden = false;
    $('chatVazio').querySelector('h2').textContent = 'Carregando conversa...';
    $('chatVazio').querySelector('p').textContent = 'Buscando o histórico de mensagens.';
    $('mensagensChat').hidden = true;
    stopMessageSubscription();
    try {
      await renderMessages();
      $('chatVazio').hidden = true;
      state.messageChannel = chatDb.channel('chat-mensagens-' + id)
        .on('postgres_changes',{event:'*',schema:'public',table:'chat_mensagens',filter:'conversa_id=eq.' + id},async () => {
          try { await renderMessages(); await loadConversations(); } catch (e) { console.error(e); }
        }).subscribe();
    } catch (error) {
      showNotice('Não foi possível abrir esta conversa: ' + error.message,true);
    }
  }
  async function assumeConversation() {
    if (!state.selected) return;
    const { data, error } = await chatDb.from('chat_conversas')
      .update({atendente_id:state.staff.id,status:'em_atendimento'})
      .eq('id',state.selected.id).select().single();
    if (error) {
      showNotice('Não foi possível assumir. Talvez outro atendente já esteja com esta conversa.',true);
      return;
    }
    state.selected = data;
    await loadConversations();
    updateChatHeader();
    showNotice('Atendimento assumido.');
  }
  async function closeConversation() {
    if (!state.selected || !canReply()) return;
    const { data, error } = await chatDb.from('chat_conversas')
      .update({status:'encerrada',encerrado_em:new Date().toISOString()})
      .eq('id',state.selected.id).select().single();
    if (error) { showNotice('Não foi possível encerrar o atendimento: ' + error.message,true); return; }
    state.selected = data;
    await loadConversations(); updateChatHeader(); showNotice('Atendimento encerrado.');
  }
  async function sendText() {
    const message = $('inputMensagem').value.trim();
    if (!message || !canReply()) return;
    $('btnEnviar').disabled = true;
    const { error } = await chatDb.from('chat_mensagens').insert({
      conversa_id:state.selected.id,remetente_tipo:'atendente',remetente_id:state.staff.id,tipo:'texto',mensagem:message
    });
    $('btnEnviar').disabled = false;
    if (error) { showNotice('Não foi possível enviar a mensagem: ' + error.message,true); return; }
    $('inputMensagem').value = '';
    await renderMessages(); await loadConversations();
  }
  function fileExtension(file) {
    const known = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif','audio/webm':'webm','audio/ogg':'ogg','audio/mp4':'m4a','audio/mpeg':'mp3','audio/aac':'aac','audio/wav':'wav','audio/x-wav':'wav'};
    return known[file.type] || (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,8);
  }
  function setPendingFile(file,duration=0) {
    if (!file) return;
    const allowed = file.type.startsWith('image/') ? allowedImageTypes.includes(file.type) : allowedAudioTypes.includes(file.type);
    if (!allowed) { showNotice('Formato não permitido. Use imagem JPG, PNG, WebP, HEIC ou áudio compatível.',true); return; }
    if (file.size > maxFileSize) { showNotice('O arquivo ultrapassa o limite de 15 MB.',true); return; }
    state.pendingFile = file; state.recordingDuration = duration;
    const preview = $('midiaPreview');
    preview.replaceChildren();
    const label = document.createElement('span');
    label.textContent = file.type.startsWith('image/') ? 'Foto pronta para envio' : 'Áudio pronto para envio';
    preview.appendChild(label);
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img'); img.src = URL.createObjectURL(file); img.alt = 'Prévia da foto'; preview.appendChild(img);
    } else {
      const audio = document.createElement('audio'); audio.controls = true; audio.src = URL.createObjectURL(file); preview.appendChild(audio);
      const time = document.createElement('small'); time.textContent = formatDuration(duration); preview.appendChild(time);
    }
    const cancel = document.createElement('button'); cancel.type='button'; cancel.textContent='Remover'; cancel.addEventListener('click',clearPendingFile); preview.appendChild(cancel);
    preview.hidden = false;
    $('btnEnviar').disabled = !canReply();
  }
  function clearPendingFile() {
    state.pendingFile = null; state.recordingDuration = 0;
    $('midiaPreview').replaceChildren(); $('midiaPreview').hidden = true;
    $('btnEnviar').disabled = !canReply() || !$('inputMensagem').value.trim();
  }
  async function sendMedia() {
    if (!state.pendingFile || !canReply()) return;
    const file = state.pendingFile;
    const isImage = file.type.startsWith('image/');
    const type = isImage ? 'imagem' : 'audio';
    const path = state.selected.id + '/' + crypto.randomUUID() + '.' + fileExtension(file);
    $('btnEnviar').disabled = true;
    try {
      const { error: uploadError } = await chatDb.storage.from('chat-midias').upload(path,file,{contentType:file.type,upsert:false});
      if (uploadError) throw uploadError;
      const { error } = await chatDb.from('chat_mensagens').insert({
        conversa_id:state.selected.id,remetente_tipo:'atendente',remetente_id:state.staff.id,
        tipo,arquivo_path:path,mime_type:file.type,tamanho_bytes:file.size,
        duracao_segundos:type === 'audio' ? state.recordingDuration : null,
        mensagem:$('inputMensagem').value.trim() || null
      });
      if (error) {
        await chatDb.storage.from('chat-midias').remove([path]);
        throw error;
      }
      clearPendingFile(); $('inputMensagem').value = '';
      await renderMessages(); await loadConversations();
    } catch (error) {
      showNotice('Não foi possível enviar a mídia: ' + error.message,true);
    } finally {
      $('btnEnviar').disabled = !canReply();
    }
  }
  function startRecordingTimer() {
    const el = $('estadoGravacao');
    el.hidden = false;
    const tick = () => { el.textContent = 'Gravando áudio · ' + formatDuration((Date.now()-state.recordingStarted)/1000) + ' · Clique no microfone para finalizar'; };
    tick(); state.recordingTimer = window.setInterval(tick,500);
  }
  async function toggleRecording() {
    if (state.recorder && state.recorder.state === 'recording') {
      state.recorder.stop(); return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      showNotice('Este navegador não oferece gravação de áudio compatível.',true); return;
    }
    try {
      state.recorderStream = await navigator.mediaDevices.getUserMedia({audio:true});
      const candidates = ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'];
      const mime = candidates.find(t => MediaRecorder.isTypeSupported(t));
      state.recorder = new MediaRecorder(state.recorderStream,mime ? {mimeType:mime} : undefined);
      state.audioChunks = []; state.recordingStarted = Date.now();
      state.recorder.ondataavailable = event => { if (event.data.size) state.audioChunks.push(event.data); };
      state.recorder.onstop = () => {
        window.clearInterval(state.recordingTimer);
        const duration = (Date.now()-state.recordingStarted)/1000;
        const blob = new Blob(state.audioChunks,{type:state.recorder.mimeType || 'audio/webm'});
        const extension = fileExtension({type:blob.type,name:'gravacao.webm'});
        const file = new File([blob],'gravacao.'+extension,{type:blob.type});
        state.recorderStream?.getTracks().forEach(track => track.stop());
        state.recorderStream = null; state.recorder = null;
        $('estadoGravacao').hidden = true; $('btnAudio').classList.remove('gravando');
        setPendingFile(file,duration);
      };
      state.recorder.start();
      $('btnAudio').classList.add('gravando');
      startRecordingTimer();
    } catch (error) {
      showNotice('Não foi possível acessar o microfone. Verifique a permissão do navegador.',true);
    }
  }
  function handleSelectedFile(event) {
    const file = event.target.files?.[0];
    if (file) setPendingFile(file);
    event.target.value = '';
  }
  async function init() {
    const { data:authData, error:authError } = await chatDb.auth.getUser();
    if (authError || !authData.user) return;
    state.user = authData.user;
    const { data:staff, error } = await chatDb.from('users')
      .select('id,nome,cargo,ativo').eq('auth_user_id',state.user.id).maybeSingle();
    if (error || !staff || staff.ativo === false) {
      showNotice('Seu usuário não está vinculado a um funcionário ativo no cadastro do Painel.',true);
      $('conexaoStatus').textContent = 'Acesso não configurado';
      return;
    }
    state.staff = staff;
    try {
      await loadConversations();
      $('conexaoStatus').textContent = 'Conectado';
      state.listChannel = chatDb.channel('chat-lista-painel')
        .on('postgres_changes',{event:'*',schema:'public',table:'chat_conversas'},async () => {
          try { await loadConversations(); } catch (e) { console.error(e); }
        }).subscribe();
    } catch (loadError) {
      $('conexaoStatus').textContent = 'Falha na conexão';
      showNotice('Não foi possível carregar as conversas: ' + loadError.message,true);
    }
  }

  $('btnAssumir').addEventListener('click',assumeConversation);
  $('btnEncerrar').addEventListener('click',closeConversation);
  $('btnEnviar').addEventListener('click',() => state.pendingFile ? sendMedia() : sendText());
  $('inputMensagem').addEventListener('input',() => { $('btnEnviar').disabled = !canReply() || (!$('inputMensagem').value.trim() && !state.pendingFile); });
  $('inputMensagem').addEventListener('keydown',event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); state.pendingFile ? sendMedia() : sendText(); } });
  $('btnCamera').addEventListener('click',() => $('arquivoCamera').click());
  $('btnGaleria').addEventListener('click',() => $('arquivoGaleria').click());
  $('arquivoCamera').addEventListener('change',handleSelectedFile);
  $('arquivoGaleria').addEventListener('change',handleSelectedFile);
  $('btnAudio').addEventListener('click',toggleRecording);
  $('buscaConversas').addEventListener('input',renderConversationList);
  $('filtroConversas').addEventListener('change',renderConversationList);
  $('btnVoltarLista').addEventListener('click',() => $('workspaceConversas').classList.remove('conversa-aberta'));
  init();
})();