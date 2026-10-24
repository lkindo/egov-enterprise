let token;

export class WorkspaceError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, headers = {}, raw = false, timeout = 30000 } = {}) {
  if (!path.startsWith('/api/')) throw new WorkspaceError('INVALID_ROUTE', '요청 경로를 확인해 주세요.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(path, {
      method, cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: controller.signal,
      headers: { ...(token ? { 'X-Workspace-Token': token } : {}), ...(body !== undefined && !raw ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
    });
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('application/json')) {
      if (response.ok && path.startsWith('/api/artifacts/')) return { content: await response.text(), contentType: type };
      throw new WorkspaceError('INVALID_RESPONSE', '실행기 응답을 확인하지 못했습니다. 입력은 유지됩니다.', response.status);
    }
    const payload = await response.json();
    if (!response.ok || payload.status === 'error' || payload.status === 'failed') {
      const code = typeof payload.code === 'string' && /^[A-Z][A-Z0-9_]{1,79}$/.test(payload.code) ? payload.code : 'REQUEST_FAILED';
      throw new WorkspaceError(code, typeof payload.message === 'string' ? payload.message.slice(0, 700) : '요청을 처리하지 못했습니다. 입력을 확인한 뒤 다시 시도해 주세요.', response.status);
    }
    return payload.data ?? payload;
  } catch (error) {
    if (error instanceof WorkspaceError) throw error;
    if (error.name === 'AbortError') throw new WorkspaceError('RESPONSE_TIMEOUT', '응답을 기다리는 시간이 지났습니다. 실행 여부를 작업 기록에서 확인한 뒤 다시 시도하세요. 입력은 유지됩니다.');
    throw new WorkspaceError('CONNECTION_LOST', '로컬 실행기에 연결하지 못했습니다. 실행 중인 터미널과 작업 상태를 확인하세요. 입력은 유지됩니다.');
  } finally {
    clearTimeout(timer);
  }
}

export async function openSession() {
  const session = await request('/api/session');
  if (typeof session.csrfToken !== 'string' || !session.csrfToken) throw new WorkspaceError('SESSION_UNAVAILABLE', '로컬 세션을 시작하지 못했습니다. 실행기를 확인해 주세요.');
  token = session.csrfToken;
}

export const api = {
  state: () => request('/api/state'),
  profile: body => request('/api/profiles', { method: 'POST', body }),
  input: body => request('/api/inputs', { method: 'POST', body }),
  upload: (kind, file, revision) => request(`/api/uploads?kind=${encodeURIComponent(kind)}`, { method: 'POST', raw: true, body: file, headers: { 'Content-Type': 'application/octet-stream', 'X-Workspace-Revision': String(revision) }, timeout: 120000 }),
  job: body => request('/api/jobs', { method: 'POST', body }),
  cancel: id => request(`/api/jobs/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: {} }),
  artifact: id => request(`/api/artifacts/${encodeURIComponent(id)}`),
  ledger: body => request('/api/ledger', { method: 'PUT', body }),
  aiStatus: () => request('/api/ai/status'),
  aiLogin: () => request('/api/ai/login', { method: 'POST', body: {} }),
  aiLoginCancel: () => request('/api/ai/login-cancel', { method: 'POST', body: {} }),
  aiLogout: () => request('/api/ai/logout', { method: 'POST', body: {} }),
  aiTest: () => request('/api/ai/test', { method: 'POST', body: {}, timeout: 210000 }),
  aiChat: body => request('/api/ai/chat', { method: 'POST', body, timeout: 150000 }),
  aiChatReset: () => request('/api/ai/chat-reset', { method: 'POST', body: {} }),
  aiConfig: body => request('/api/ai/config', { method: 'POST', body }),
  aiReadPlan: body => request('/api/ai/read-plan', { method: 'POST', body }),
  aiPreview: body => request('/api/ai/preview', { method: 'POST', body }),
  aiAsk: body => request('/api/ai/ask', { method: 'POST', body, timeout: 120000 }),
  aiApply: body => request('/api/ai/apply', { method: 'POST', body }),
};
