import { $, element, field, feedback } from './dom.js';

const vendors = [['postgresql', 'PostgreSQL'], ['oracle', 'Oracle'], ['mysql', 'MySQL'], ['mariadb', 'MariaDB'], ['sqlserver', 'Microsoft SQL Server']];
const ports = { postgresql: '5432', oracle: '1521', mysql: '3306', mariadb: '3306', sqlserver: '1433' };
const drivers = { postgresql: 'org.postgresql.Driver', oracle: 'oracle.jdbc.OracleDriver', mysql: 'com.mysql.cj.jdbc.Driver', mariadb: 'org.mariadb.jdbc.Driver', sqlserver: 'com.microsoft.sqlserver.jdbc.SQLServerDriver' };
const forms = new Map();
const identityFields = ['vendor', 'host', 'port', 'database', 'username', 'oracleMode', 'instance', 'driverJar', 'driverClass'];
const identity = profile => JSON.stringify(identityFields.map(name => name === 'oracleMode' && profile.vendor !== 'oracle' || name === 'instance' && profile.vendor !== 'sqlserver' ? '' : String(profile[name] ?? '').trim()));

export function createProfiles(onSave) {
  for (const role of ['source', 'target']) {
    const form = element('form', { id: `${role}-profile-form`, className: 'panel profile-form' });
    const title = role === 'source' ? '원천 DB · 읽기 계정' : '대상 DB · PostgreSQL';
    const body = element('div', { className: 'panel-body form-stack' });
    const vendor = field(`${role}-vendor`, 'DBMS', { value: 'postgresql', options: role === 'target' ? [vendors[0]] : vendors });
    const grid = element('div', { className: 'field-grid' });
    const controls = new Map([['vendor', vendor.input]]);
    const add = (name, label, options = {}, container = grid) => {
      const created = field(`${role}-${name}`, label, options);
      controls.set(name, created.input);
      container.append(created.wrapper);
      return created;
    };
    add('host', '호스트', { required: true, placeholder: 'DB 서버 주소' });
    add('port', '포트', { type: 'number', value: ports.postgresql, min: '1', max: '65535', required: true });
    const database = add('database', '데이터베이스 이름', { required: true });
    const schema = add('schema', '분석·검증 스키마', { placeholder: 'public', required: true });
    add('username', '접속 계정', { required: true });
    add('password', '세션 비밀번호', { type: 'password', autocomplete: 'new-password', hint: '새 비밀번호는 실행기 세션에서만 사용하며 저장 후 이 칸을 비웁니다. 같은 DB·계정의 TLS·스키마만 수정하면 아래 선택으로 현재 세션 비밀번호를 유지할 수 있습니다.' });
    const keepPassword = element('input', { id: `${role}-keep-password`, type: 'checkbox', checked: true });
    const credentialHint = element('small', { id: `${role}-credential-hint`, className: 'subtext' });
    keepPassword.setAttribute('aria-describedby', credentialHint.id);
    const keepWrapper = element('div', { className: 'form-stack', hidden: true }, element('label', { className: 'check' }, keepPassword, element('span', { text: '현재 세션 비밀번호 유지' })), credentialHint);
    const oracleMode = add('oracleMode', 'Oracle 접속 방식', { value: 'service', options: [['service', '서비스 이름'], ['sid', 'SID']] });
    const instance = add('instance', 'SQL Server 인스턴스', { hint: '입력하면 named instance로 연결하며 포트 입력은 사용하지 않습니다. 인스턴스 검색을 위한 DB 네트워크 설정이 필요합니다.' });
    const advanced = element('details', { className: 'advanced' }, element('summary', { text: 'TLS·드라이버 설정' }));
    const advancedFields = element('div', { className: 'field-grid' });
    add('tlsMode', 'TLS 요구 수준', { value: 'verify-full', options: [['verify-full', '인증서·호스트 확인'], ['require', '암호화 연결 필요'], ['disable', 'TLS 사용 안 함']], hint: '기본값은 인증서·호스트 확인입니다. 서버가 TLS를 지원하지 않아도 자동으로 해제하지 않습니다. DB 관리자에게 지원 여부와 허용 정책을 확인한 뒤 직접 선택하고 저장하세요.' }, advancedFields);
    add('driverJar', '외부 JDBC JAR 절대 경로', { placeholder: '필요한 벤더 드라이버를 준비한 경우' }, advancedFields);
    add('driverClass', 'JDBC driver class', { readonly: true, hint: '선택한 DBMS의 고정 driver class를 사용합니다.' }, advancedFields);
    advanced.append(advancedFields, element('p', { className: 'subtext', text: '임의 JDBC URL·TNS 별칭·통합 인증·터널 자동 구성은 현재 제공하지 않습니다. 지원되지 않는 TLS 조합은 실행기에서 차단합니다.' }));
    const submit = element('button', { type: 'submit', className: 'button primary', text: '연결 설정 저장', 'data-profile-save': role });
    const status = element('p', { id: `${role}-profile-feedback`, role: 'status' });
    form.append(element('div', { className: 'panel-head' }, element('h2', { text: title }), element('span', { className: 'pill neutral', id: `${role}-profile-status`, text: '미저장' })), body);
    body.append(vendor.wrapper, grid, keepWrapper, advanced, submit, status);
    const entry = { form, controls, dirty: false, initialized: false, editGeneration: 0, credentialReady: false, savedProfile: undefined };
    forms.set(role, entry);
    const currentProfile = () => Object.fromEntries([...controls].filter(([name]) => name !== 'password').map(([name, input]) => [name, input.value]));
    const updateCredentialChoice = () => {
      const changedIdentity = entry.savedProfile && identity(entry.savedProfile) !== identity(currentProfile());
      keepWrapper.hidden = !entry.credentialReady;
      keepPassword.disabled = !entry.credentialReady || !!changedIdentity || !!controls.get('password').value;
      credentialHint.textContent = controls.get('password').value ? '새 비밀번호로 교체합니다.' : changedIdentity ? '접속 대상·계정·드라이버가 바뀌어 기존 비밀번호를 유지할 수 없습니다. 새 비밀번호를 입력하세요.' : keepPassword.checked ? '현재 세션 비밀번호를 유지합니다. 다시 시작한 실행기에는 비밀번호를 재입력해야 합니다.' : '새 비밀번호 없이 저장하면 현재 세션 비밀번호가 해제됩니다.';
    };
    entry.updateCredentialChoice = updateCredentialChoice;
    const updateFields = (changePort = false) => {
      const value = vendor.input.value;
      controls.get('driverClass').value = drivers[value];
      if (changePort && Object.values(ports).includes(controls.get('port').value)) controls.get('port').value = ports[value];
      oracleMode.wrapper.hidden = value !== 'oracle';
      instance.wrapper.hidden = value !== 'sqlserver';
      controls.get('port').disabled = value === 'sqlserver' && !!instance.input.value.trim();
      database.wrapper.firstElementChild.textContent = value === 'oracle' ? (controls.get('oracleMode').value === 'sid' ? 'Oracle SID' : 'Oracle 서비스 이름') : '데이터베이스 이름';
      schema.input.placeholder = value === 'oracle' ? '스키마 소유자' : value === 'sqlserver' ? 'dbo' : value === 'postgresql' ? 'public' : '데이터베이스와 동일한 범위';
      updateCredentialChoice();
    };
    entry.updateFields = updateFields;
    form.addEventListener('input', () => { entry.dirty = true; entry.editGeneration += 1; updateCredentialChoice(); feedback(`${role}-profile-feedback`, '아직 저장하지 않은 입력이 있습니다.'); });
    vendor.input.addEventListener('change', () => updateFields(true));
    controls.get('oracleMode').addEventListener('change', () => updateFields());
    instance.input.addEventListener('input', () => updateFields());
    form.addEventListener('submit', event => {
      event.preventDefault();
      const profile = {};
      for (const [name, input] of controls) {
        if (name === 'password' || (name === 'oracleMode' && vendor.input.value !== 'oracle') || (name === 'instance' && vendor.input.value !== 'sqlserver')) continue;
        if (input.value.trim()) profile[name] = name === 'port' ? Number(input.value) : input.value.trim();
      }
      const password = controls.get('password').value;
      if (!password && entry.credentialReady && keepPassword.checked && identity(entry.savedProfile) !== identity(profile)) {
        feedback(`${role}-profile-feedback`, '접속 대상·계정·드라이버가 바뀌었습니다. 새 세션 비밀번호를 입력한 뒤 저장하세요.', true);
        controls.get('password').focus(); return;
      }
      const credentialAction = password ? 'replace' : entry.credentialReady && keepPassword.checked ? 'keep' : 'clear';
      onSave(role, profile, password, entry.editGeneration, credentialAction);
    });
    updateFields();
    $('profile-forms').append(form);
  }
}

export function syncProfiles(profiles = {}) {
  for (const [role, entry] of forms) {
    const profile = profiles[role];
    const hadCredentials = entry.credentialReady;
    entry.credentialReady = profile?.credentialReady === true;
    entry.savedProfile = profile;
    if (!hadCredentials && entry.credentialReady && !entry.dirty) $(`${role}-keep-password`).checked = true;
    $(`${role}-profile-status`).textContent = profile ? `${entry.dirty ? '미저장 변경 있음 · ' : ''}설정 저장됨 · ${profile.credentialReady ? '세션 비밀번호 준비됨' : '세션 비밀번호 필요'} · 연결 별도 확인` : '미저장';
    if (entry.dirty || (entry.initialized && !profile)) { entry.updateCredentialChoice(); continue; }
    if (profile) for (const [key, input] of entry.controls) if (key !== 'password' && profile[key] !== undefined) input.value = String(profile[key]);
    entry.initialized = true;
    entry.updateFields();
  }
}

export function profileSaved(role, submittedGeneration) {
  const entry = forms.get(role);
  if (entry.editGeneration !== submittedGeneration) return;
  entry.dirty = false;
  entry.controls.get('password').value = '';
  $(`${role}-keep-password`).checked = true;
  entry.updateCredentialChoice();
  feedback(`${role}-profile-feedback`, '연결 설정을 저장했습니다. 실제 연결은 조사·계획·검증 작업 결과에서 확인하세요.');
}

export function hasDirtyProfiles(role) { return role ? forms.get(role)?.dirty === true : [...forms.values()].some(entry => entry.dirty); }

export function focusProfileField(role, name) {
  const input = forms.get(role)?.controls.get(name);
  if (!input) return;
  const details = input.closest('details');
  if (details) details.open = true;
  input.focus({ preventScroll: true });
  input.scrollIntoView({ block: 'center' });
}
