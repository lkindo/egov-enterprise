// 자동 포함 변화 문장(E7). 화면 상태를 인자로 받는 순수 함수다(app.js 가 부른다).
// base: 마지막으로 알린 계획의 시작 구성·직접 선택·자동 포함(과 그 뿌리). label: 기능 id → 화면 이름.
// 마지막으로 알린 계획(기준)과 지금 계획을 비교해, 무엇을 바꿔 자동 포함이 어떻게 달라졌는지 한 문장으로 말한다.
// 계획이 오기 전에 여러 번 바꿨으면 순변화만 말한다(마지막 행동 하나를 주어로 삼지 않는다). 기능 이름만 잇고 조사가
// 붙지 않게 괄호로 묶는다.
// - 해제했는데 다른 선택이 필요로 해 남은 기능은 '늘었다' 가 아니라 '남았다' 로 말한다.
// - 시작 구성은 이름 붙은 기능 목록이고 같은 목록의 직접 선택과 결과가 같다(해석기 단일화, 매니페스트 v2 11단계 C2). 그래서 시작
//   구성에서 직접 선택으로 바뀌는 것만으로는 자동 포함이 달라지지 않고, 전환을 따로 말하지 않는다. 카드를 누르면 바꾼 카드만 주어다.
// - 고른 것과 뺀 것이 섞이면 '바꾼 구성으로' 라고만 말한다.
export function inclusionChange({ base, plan, selected, preset, catalog, label }) {
  const now = new Map((plan.inclusionNotes ?? []).map(note => [note.domain, note.roots ?? []]));
  const resolved = new Set(plan.resolvedDomains ?? []);
  const names = ids => ids.map(label).join(', ');
  const order = new Map(catalog.capabilities.map((item, index) => [item.id, index]));
  const sorted = ids => ids.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  const on = sorted([...selected].filter(id => !base.selected.has(id)));
  const off = sorted([...base.selected].filter(id => !selected.has(id)));
  let subject = '';
  if (preset !== base.preset && preset !== 'custom') subject = `‘${catalog.presentation.presets[preset]?.label ?? preset}’ 구성 선택으로`;
  else if (on.length && off.length) subject = '바꾼 구성으로';
  else if (on.length || off.length) subject = `${names(on.length ? on : off)} ${on.length ? '선택으로' : '해제로'}`;
  // 직접 선택이 같으면(이름·구조만 바꾸거나 같은 목록의 직접 선택으로 바꿈) 자동 포함도 같다. 바꾼 것이 없으면 말하지 않는다.
  if (!subject) return '';
  const kept = off.filter(id => now.has(id));
  const added = [...now.keys()].filter(id => !base.automatic.has(id) && !kept.includes(id));
  const removed = [...base.automatic.keys()].filter(id => !now.has(id) && !resolved.has(id));
  const parts = [];
  if (added.length) parts.push(`${subject} 함께 포함되는 기능이 ${added.length}개 늘었습니다(${names(added)}).`);
  if (removed.length) parts.push(`${added.length ? '' : `${subject} `}함께 포함되던 기능 ${removed.length}개가 빠졌습니다(${names(removed)}).`);
  if (kept.length) parts.push(`다른 선택이 필요로 해 함께 포함된 채 남은 기능: ${names(kept)}.`);
  return parts.join(' ');
}
