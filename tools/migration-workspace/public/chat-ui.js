import { $, element, feedback } from './dom.js';
import { fieldCatalog, parseChatDraft, validateDraftPatches } from './chat-contract.mjs';

// Connection values and undo snapshots are memory-only. Local input enters the transcript as safe summaries.
export function createChatUi({ getContext, sendChat, resetChat, navigate }) {
  const catalog = (Array.isArray(fieldCatalog) ? fieldCatalog : Object.values(fieldCatalog)).map(field => ({ ...field, fieldId: field.id ?? field.fieldId }));
  const fields = new Map(catalog.map(field => [field.fieldId, field]));
  let pending, conversationId, remoteQuestion, proposed, undo, working = false;
  let messageCount = 0;
  const values = () => Object.fromEntries(catalog.filter(field => $(field.fieldId)).map(field => [field.fieldId, $(field.fieldId).value]));
  const credentialChoices = () => Object.fromEntries(['source', 'target'].map(role => [`${role}-keep-password`, $(`${role}-keep-password`)?.checked ?? false]));
  const screen = () => location.hash.slice(1) || 'start';
  const identity = () => JSON.stringify([getContext().aiStatus?.provider, getContext().aiStatus?.model, getContext().aiStatus?.authenticated]);
  let lastIdentity = identity(), aiGeneration = 0;
  const snapshot = () => ({ revision: getContext().revision, values: values(), credentialChoices: credentialChoices(), identity: identity(), aiGeneration, pending: pending ? structuredClone(pending) : undefined });
  const isCurrent = (captured, includeAi = false) => captured.revision === getContext().revision && JSON.stringify(captured.values) === JSON.stringify(values()) && JSON.stringify(captured.credentialChoices) === JSON.stringify(credentialChoices()) && (!includeAi || captured.identity === identity() && captured.aiGeneration === aiGeneration);
  const label = id => fields.get(id)?.label ?? id;
  const modelReady = () => getContext().aiStatus?.chatAvailable === true && typeof sendChat === 'function';
  function say(role, text) {
    if (!text) return;
    const item = element('div', { className: `chat-message ${role === 'user' ? 'from-user' : 'from-assistant'}` }, element('strong', { className: 'chat-speaker', text: role === 'user' ? '나' : '이관 도우미' }), element('p', { text }));
    $('chat-messages').append(item); messageCount += 1;
    if (messageCount > 60) { $('chat-messages').firstElementChild.remove(); messageCount -= 1; }
    item.scrollIntoView({ block: 'nearest' });
  }
  function intro() { say('assistant', '어떤 작업을 준비하고 계신가요? 원천 DB 종류나 이미 알고 있는 연결 정보를 알려주시면 화면 초안을 채우고 빠진 항목을 물어보겠습니다. 비밀번호는 연결 화면의 전용 칸을 사용하세요. 저장과 실행은 각 화면에서 직접 확인합니다.'); }
  function sync() {
    const context = getContext();
    if (identity() !== lastIdentity) {
      lastIdentity = identity(); aiGeneration += 1; conversationId = undefined; remoteQuestion = undefined;
      $('chat-remote-panel').hidden = true;
      if (proposed && !proposed.local) { proposed = undefined; $('chat-patch-panel').hidden = true; }
    }
    $('chat-send').disabled = working || context.busy || !context.ready || !!proposed;
    $('chat-remote-send').disabled = working || context.busy || !!proposed || !remoteQuestion || !modelReady();
    $('chat-new').disabled = working;
    $('chat-apply').disabled = working || context.busy || !proposed;
    $('chat-undo').disabled = working || context.busy || !undo;
    $('chat-undo').hidden = !undo;
    $('chat-connection').textContent = modelReady() ? 'AI 연결 확인됨 · 로컬 입력 처리 가능' : '로컬 입력 안내 가능 · AI 연결 검사 필요';
    $('chat-connection').className = `pill ${modelReady() ? 'good' : 'neutral'}`;
    $('chat-connection-reason').textContent = modelReady() ? '화면 입력값과 기관 자료는 일반 대화에 보내지 않습니다. 자료에 근거한 검토는 AI 도우미 화면을 사용하세요.' : `필드 입력은 로컬에서 처리합니다. 자유 질문은 AI 연결을 확인한 뒤 사용할 수 있습니다.${context.aiStatus?.chatBlockedReason ? ` (${context.aiStatus.chatBlockedReason})` : ''}`;
    $('chat-panel').setAttribute('aria-busy', String(working));
  }
  function open() {
    $('chat-panel').hidden = false; $('chat-toggle').setAttribute('aria-expanded', 'true');
    if (!messageCount) intro();
    sync(); $('chat-input').focus();
  }
  function close() { $('chat-panel').hidden = true; $('chat-toggle').setAttribute('aria-expanded', 'false'); $('chat-toggle').focus(); }
  function writeValues(patches) {
    const ordered = [...patches].sort((a, b) => Number(b.fieldId.endsWith('-vendor')) - Number(a.fieldId.endsWith('-vendor')));
    for (const patch of ordered) { const input = $(patch.fieldId); if (!input || input.type === 'file' || input.readOnly) throw new Error('FIELD_UNAVAILABLE'); }
    for (const patch of ordered) {
      const input = $(patch.fieldId);
      if (!input || input.type === 'file' || input.readOnly) throw new Error('FIELD_UNAVAILABLE');
      input.value = String(patch.value ?? '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  function displayValue(id, value) {
    return /password/i.test(id) || fields.get(id)?.type === 'password' ? value ? '●●●● · 표시하지 않음' : '비어 있음' : String(value || '비어 있음');
  }
  function highlightField(id) {
    if (!fields.has(id)) return;
    navigate(fields.get(id).route);
    requestAnimationFrame(() => {
      document.querySelectorAll('.chat-field-highlight').forEach(input => input.classList.remove('chat-field-highlight'));
      const input = $(id);
      if (input) { input.classList.add('chat-field-highlight'); input.scrollIntoView({ block: 'center', behavior: 'auto' }); }
    });
  }
  function applyDraft(change) {
    if (!isCurrent(change.snapshot, !change.local)) { feedback('chat-feedback', '대화 이후 화면 입력, AI 연결 또는 작업 판이 바뀌었습니다. 현재 화면 기준으로 다시 요청해 주세요.', true); return false; }
    const verified = validateDraftPatches(change.patches, { values: values(), allowSensitive: change.local });
    const before = values();
    writeValues(verified);
    const after = values();
    undo = { revision: getContext().revision, before, after, credentialChoices: credentialChoices(), pendingBefore: change.snapshot.pending, pendingAfter: pending ? structuredClone(pending) : undefined, changed: Object.keys(after).filter(id => before[id] !== after[id]) };
    proposed = undefined; $('chat-patch-panel').hidden = true;
    say('assistant', `${verified.map(patch => label(patch.fieldId)).join(', ')} 입력 칸에 초안을 반영했습니다. 저장하거나 DB에 연결하지 않았습니다.`);
    if (change.route) navigate(change.route);
    highlightField(verified.at(-1)?.fieldId);
    feedback('chat-feedback', '화면에서 반영된 초안을 확인하세요. 마지막 반영은 되돌릴 수 있습니다.');
    sync(); return true;
  }
  function offerPatches(patches, captured, { local = false, route } = {}) {
    const verified = validateDraftPatches(patches, { values: captured.values, allowSensitive: local });
    if (!verified.length) return;
    const change = { patches: verified, snapshot: captured, local, route };
    const overwrites = verified.some(patch => captured.values[patch.fieldId] !== '' && String(captured.values[patch.fieldId]) !== String(patch.value));
    if (local && !overwrites) { applyDraft(change); return; }
    proposed = change;
    $('chat-patch-list').replaceChildren();
    for (const patch of verified) $('chat-patch-list').append(element('div', { className: 'chat-patch-row' }, element('strong', { text: label(patch.fieldId) }), element('p', { text: `현재: ${displayValue(patch.fieldId, captured.values[patch.fieldId])}` }), element('p', { text: `제안: ${displayValue(patch.fieldId, patch.value)}` })));
    $('chat-patch-origin').textContent = local ? '기존 입력을 바꿉니다. 변경을 확인해 주세요.' : 'AI 제안입니다. 변경과 업무 의미를 확인해 주세요.';
    $('chat-patch-panel').hidden = false; feedback('chat-feedback', '변경안을 반영하거나 닫은 뒤 답변을 이어가세요.'); sync();
  }
  function dismissRemote() { remoteQuestion = undefined; $('chat-remote-panel').hidden = true; sync(); }
  async function receiveInput(event) {
    event.preventDefault();
    if (working || proposed || getContext().busy || !getContext().ready) return;
    const text = $('chat-input').value.trim();
    if (!text) return;
    feedback('chat-feedback', '');
    const captured = snapshot();
    try {
      const local = parseChatDraft({ message: text, pending, values: captured.values, route: screen() });
      if (local.handled) {
        dismissRemote(); pending = local.pending;
        say('user', local.displayMessage || '화면 입력에 대한 답변을 전달했습니다.');
        $('chat-input').value = '';
        if (local.reply) say('assistant', local.reply);
        if (local.patches?.length) offerPatches(local.patches, captured, { local: true, route: local.navigate });
        else if (local.navigate) navigate(local.navigate);
      } else {
        remoteQuestion = { text, displayMessage: local.displayMessage || '일반 이관 질문을 보냈습니다.', snapshot: captured, screen: screen() };
        $('chat-remote-panel').hidden = false;
        feedback('chat-feedback', modelReady() ? '입력한 일반 질문만 외부 AI에 보냅니다. 아래 보내기를 눌러 이어가세요.' : '일반 질문에는 AI 연결 검사가 필요합니다. 연결 화면에서 검사를 마친 뒤 이 질문을 이어갈 수 있습니다.');
      }
    } catch { feedback('chat-feedback', '입력을 안전하게 처리하지 못했습니다. 접속정보는 연결 폼에 입력하고, 필요한 항목을 하나씩 알려주세요.', true); }
    sync();
  }
  async function sendRemote() {
    if (!remoteQuestion || working || proposed || getContext().busy || !modelReady()) return;
    const request = remoteQuestion;
    if ($('chat-input').value.trim() !== request.text || !isCurrent(request.snapshot, true)) { dismissRemote(); feedback('chat-feedback', '질문, 화면 입력 또는 AI 연결이 바뀌었습니다. 입력 전달을 다시 눌러 확인해 주세요.', true); return; }
    working = true; sync(); feedback('chat-feedback', 'AI가 이어질 질문을 준비하고 있습니다.');
    try {
      const result = await sendChat({ revision: request.snapshot.revision, ...(conversationId ? { conversationId } : {}), message: request.text, screen: request.screen, filledFields: Object.keys(request.snapshot.values).filter(id => request.snapshot.values[id] !== '') });
      const hasNewInput = $('chat-input').value.trim() !== request.text;
      // The server accepted this ordinary question after its sensitive-content checks.
      say('user', request.text);
      if ($('chat-input').value.trim() === request.text) $('chat-input').value = '';
      dismissRemote();
      if (result.message) say('assistant', result.message);
      if (result.question && result.question !== result.message) say('assistant', result.question);
      if (!isCurrent(request.snapshot, true) || (result.revision !== undefined && result.revision !== request.snapshot.revision)) { feedback('chat-feedback', '답변을 기다리는 동안 입력, AI 연결 또는 작업 판이 바뀌었습니다. 필드 제안은 반영하지 않았습니다.', true); return; }
      conversationId = result.conversationId;
      if (hasNewInput) { feedback('chat-feedback', '새로 작성 중인 입력을 유지했습니다. 이전 응답의 화면 이동과 필드 제안은 반영하지 않았습니다.'); return; }
      if (result.focusField && fields.has(result.focusField)) pending = { fieldId: result.focusField, ...(fields.get(result.focusField).type === 'password' ? { directOnly: true } : {}) };
      else pending = undefined;
      if (result.patches?.length) offerPatches(result.patches, request.snapshot, { local: false, route: result.route });
      else if (result.route) navigate(result.route);
      if (result.focusField) highlightField(result.focusField);
      feedback('chat-feedback', proposed ? '변경안을 반영하거나 닫은 뒤 답변을 이어가세요.' : '답변을 이어 입력하세요. 부족한 값은 로컬에서 해당 입력 칸에 반영합니다.');
    } catch (error) {
      if (error.code === 'AI_CHAT_EXPIRED') conversationId = undefined;
      feedback('chat-feedback', error.code === 'AI_CHAT_EXPIRED' ? '이전 AI 대화가 만료되었습니다. 입력은 유지했습니다. 다시 보내면 새 대화로 이어갑니다.' : `AI 응답을 확인하지 못했습니다. 입력은 유지했습니다.${/^[A-Z][A-Z0-9_]+$/.test(error.code ?? '') ? ` (${error.code})` : ''}`, true);
    }
    finally { working = false; sync(); }
  }
  $('chat-toggle').addEventListener('click', () => $('chat-panel').hidden ? open() : close());
  $('chat-close').addEventListener('click', close);
  $('chat-panel').addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); close(); } });
  $('chat-form').addEventListener('submit', receiveInput);
  $('chat-input').addEventListener('input', dismissRemote);
  $('chat-remote-send').addEventListener('click', sendRemote);
  $('chat-remote-cancel').addEventListener('click', dismissRemote);
  $('chat-apply').addEventListener('click', () => { try { if (proposed) applyDraft(proposed); } catch { feedback('chat-feedback', '필드 변경을 검증하지 못해 반영하지 않았습니다. 현재 입력을 확인하세요.', true); } });
  $('chat-patch-cancel').addEventListener('click', () => { proposed = undefined; pending = undefined; $('chat-patch-panel').hidden = true; sync(); });
  $('chat-undo').addEventListener('click', () => {
    if (!undo) return;
    const current = values();
    if (undo.revision !== getContext().revision || JSON.stringify(current) !== JSON.stringify(undo.after) || JSON.stringify(undo.credentialChoices) !== JSON.stringify(credentialChoices())) { feedback('chat-feedback', '반영 이후 입력이나 작업 판이 바뀌어 덮어쓰지 않았습니다. 화면에서 직접 확인하세요.', true); return; }
    try { writeValues(undo.changed.map(fieldId => ({ fieldId, value: undo.before[fieldId] }))); if (JSON.stringify(pending) === JSON.stringify(undo.pendingAfter)) pending = undo.pendingBefore; undo = undefined; say('assistant', '마지막 필드 반영을 되돌렸습니다. 저장된 서버 자료는 변경하지 않았습니다.'); sync(); }
    catch { feedback('chat-feedback', '되돌릴 입력 칸을 확인하지 못했습니다. 화면에서 직접 확인하세요.', true); }
  });
  $('chat-new').addEventListener('click', async () => {
    if (working) return;
    working = true; sync();
    try {
      if (resetChat) await resetChat();
      pending = undefined; conversationId = undefined; proposed = undefined; undo = undefined;
      dismissRemote(); $('chat-patch-panel').hidden = true; $('chat-messages').replaceChildren(); messageCount = 0;
      $('chat-input').value = ''; intro(); feedback('chat-feedback', '새 대화를 시작했습니다. 화면 입력과 저장 자료는 유지합니다.');
    } catch { feedback('chat-feedback', '실행기의 대화를 초기화하지 못했습니다. 현재 대화와 입력을 유지했습니다.', true); }
    finally { working = false; sync(); }
  });
  document.querySelectorAll('[data-chat-starter]').forEach(button => button.addEventListener('click', () => { open(); $('chat-input').value = button.dataset.chatStarter; $('chat-input').focus(); }));
  sync();
  return { open, sync };
}
