// 구성(recipe) 파일 저장과 불러오기(E9, 설계서 21장). 파일은 이 브라우저에서만 읽고 쓴다. 불러온 구성은 화면의 선택으로 옮긴 뒤
// 평소처럼 지금 원본으로 계획을 다시 확인한다 — 기록된 원본 커밋은 비교해 알리기만 한다(그 커밋으로 만들려면 체크아웃이 필요하다).
// 값이 맞는지(이름 규칙·원본)는 평소처럼 화면과 서버가 판정하고, 여기서는 옮길 수 있는 모양인지와 지금 원본에 없는 것만 본다.
export const RECIPE_FILE_LIMIT = 64 * 1024;

// 구성을 파일로 내려받는다(선택 정보 저장).
export function saveRecipeFile(value) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${value.project.name}.recipe.json`;
  document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const LAYOUTS = new Set(['multi-module', 'single-module']);
const NOT_A_RECIPE = '이 파일은 생성기 구성 파일(선택 정보 저장으로 받은 파일) 형식이 아닙니다.';
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// 파일에서 온 글자는 그대로 화면에 싣지 않고 길이를 자른다(textContent 로만 쓴다).
const clip = (value, limit = 60) => (String(value).length > limit ? `${String(value).slice(0, limit)}…` : String(value));

export function parseRecipe(content) {
  let value;
  try { value = JSON.parse(content); } catch { throw new Error('구성 파일을 읽지 못했습니다. JSON 형식이 아닙니다.'); }
  const selection = value?.selection;
  const domains = selection?.domains;
  const oneSelection = isObject(selection) && (typeof selection.preset === 'string') !== Array.isArray(domains)
    && (!Array.isArray(domains) || domains.every(id => typeof id === 'string'));
  if (!isObject(value) || value.schemaVersion !== 1 || !isObject(value.project) || typeof value.project.name !== 'string' || !oneSelection
    || !isObject(value.database) || typeof value.database.vendor !== 'string' || !LAYOUTS.has(value.backendLayout)
    || (value.sourceRef !== undefined && typeof value.sourceRef !== 'string')) throw new Error(NOT_A_RECIPE);
  return value;
}

// 구성 파일은 1KB 안팎이다. 너무 큰 파일은 읽기 전에 거른다.
export async function readRecipeFile(file) {
  if (file.size > RECIPE_FILE_LIMIT) throw new Error('구성 파일이 너무 큽니다. 64KB 이하의 구성 파일을 고르세요.');
  return parseRecipe(await file.text());
}

// 불러온 구성을 지금 원본에 맞춘다: 없는 시작 구성·기능·데이터베이스는 빼고 그 사실과, 다른 원본에서 저장했으면 그 사실을 문장으로 돌려준다.
export function planImport({ value, fileName, catalog, vendors }) {
  const notes = [`‘${clip(fileName, 80)}’ 구성을 불러왔습니다.`];
  const label = id => catalog.capabilities.find(item => item.id === id)?.label ?? id;
  let selection = value.selection;
  if (selection.preset !== undefined && !catalog.presets.some(item => item.id === selection.preset)) {
    notes.push(`지금 원본에 없는 시작 구성(${clip(selection.preset)})이라 기능을 고르지 않은 직접 선택으로 불러왔습니다.`);
    selection = { domains: [] };
  }
  if (selection.domains) {
    const known = new Set(catalog.capabilities.map(item => item.id));
    const dropped = [...new Set(selection.domains.filter(id => !known.has(id)))];
    if (dropped.length) notes.push(`지금 원본에 없는 기능은 빼고 불러왔습니다: ${dropped.slice(0, 5).map(id => clip(id, 40)).join(', ')}${dropped.length > 5 ? ` 외 ${dropped.length - 5}개` : ''}.`);
    selection = { domains: [...new Set(selection.domains.filter(id => known.has(id)))] };
  }
  const vendor = vendors.includes(value.database.vendor) ? value.database.vendor : null;
  if (!vendor) notes.push(`지원하지 않는 데이터베이스(${clip(value.database.vendor)})라 지금 고른 데이터베이스로 불러왔습니다.`);
  const recorded = typeof value.sourceRef === 'string' && /^[0-9a-f]{7,40}$/i.test(value.sourceRef) ? value.sourceRef.toLowerCase() : null;
  if (recorded && !String(catalog.sourceCommit ?? '').toLowerCase().startsWith(recorded)) {
    notes.push(`이 구성은 다른 원본(커밋 ${recorded.slice(0, 12)})에서 저장했습니다. 지금 원본으로 다시 확인합니다.`
      + ' 저장한 원본 그대로 만들려면 저장소를 그 커밋으로 체크아웃한 뒤 생성기를 다시 시작하세요.');
  }
  const summary = selection.preset
    ? `시작 구성 ‘${catalog.presentation.presets[selection.preset]?.label ?? selection.preset}’`
    : `기능 ${selection.domains.length}개 직접 선택${selection.domains.length ? `(${selection.domains.map(label).join(', ')})` : ''}`;
  return { recipe: { ...value, selection }, vendor, notes, summary: `${clip(fileName, 80)} 불러옴 · ${summary}` };
}
