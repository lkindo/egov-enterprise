// 메뉴 미리보기는 원본 메뉴 계층을 그대로 보인다(E8). 상위·순서로 중첩 목록을 만들고(화면 낭독기는 목록 수준으로 읽는다),
// 화면 없이 묶기만 하는 메뉴·이 구성에서 화면이 빠진 메뉴·공통 기반 구성에 없는 메뉴를 글자로 표시한다(모양만으로 나누지 않는다).
// 목록은 Tailwind 기본 스타일이 글머리표를 지워 WebKit 이 목록으로 알리지 않을 수 있으므로 role="list" 를 단다.
// '추가됨' 은 이름 뒤에서 동작('일정 추가')으로 읽히지 않게 상태로 말한다.
const MENU_KIND_TAGS = { category: '분류', detached: '목적지 없음' };
export function renderMenuTree({ list, summary, text }, menus) {
  const kindOf = menu => menu.kind ?? (menu.path ? 'screen' : 'category');
  const ids = new Set(menus.map(menu => menu.id).filter(id => id != null));
  const children = new Map();
  for (const menu of menus) {
    // 상위가 목록에 없는 메뉴는 맨 위에 둔다(목록이 상위를 빠뜨려도 메뉴를 잃지 않게).
    const parent = menu.parent != null && ids.has(menu.parent) ? menu.parent : null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(menu);
  }
  for (const siblings of children.values()) siblings.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.id ?? 0) - (b.id ?? 0));
  const branch = parent => (children.get(parent) ?? []).map(menu => {
    const row = document.createElement('li');
    if (menu.id != null) row.dataset.menu = String(menu.id);
    const head = text('div', '', 'flex flex-wrap items-baseline gap-x-2');
    head.append(text('span', menu.label ?? menu.name ?? menu.id, 'font-medium'));
    for (const tag of [MENU_KIND_TAGS[kindOf(menu)], menu.added ? '추가됨' : null].filter(Boolean)) {
      // 표시 사이에 낭독용 쉼표를 둔다(붙여 읽히지 않게). 이 쉼표는 절대 위치로 놓이므로 목록(스크롤 상자)이
      // 위치 기준이어야 상자 밖 페이지에 빈 스크롤을 만들지 않는다(index.html 의 목록에 relative).
      head.append(text('span', ', ', 'sr-only'), text('span', tag, 'rounded border border-line px-1.5 text-xs text-muted'));
    }
    row.append(head);
    if (menu.path) row.append(text('span', menu.path, 'block break-all text-xs text-muted'));
    const nested = menu.id != null ? branch(menu.id) : [];
    if (nested.length) {
      const nestedList = text('ul', '', 'mt-2 space-y-2 border-l border-line pl-3');
      nestedList.setAttribute('role', 'list');
      nestedList.append(...nested);
      row.append(nestedList);
    }
    return row;
  });
  list.replaceChildren(...branch(null));
  if (!menus.length) list.append(text('li', '포함된 메뉴가 없습니다.'));
  const count = kind => menus.filter(menu => kindOf(menu) === kind).length;
  const parts = [`화면 ${count('screen')}개`, `분류 ${count('category')}개`];
  if (count('detached')) parts.push(`목적지 없음 ${count('detached')}개`);
  // 공통 기반과 비교한 값이 없으면(그 시작 구성이 없는 카탈로그) 추가 수를 말하지 않는다.
  if (menus.some(menu => typeof menu.added === 'boolean')) parts.push(`공통 기반 대비 추가됨 ${menus.filter(menu => menu.added).length}개`);
  const notes = count('detached') ? ' 목적지 없음은 원본에는 화면이 있지만 이 구성에서 그 화면이 빠져 하위 메뉴만 묶는 메뉴입니다.' : '';
  summary.textContent = menus.length ? `${parts.join(' · ')}.${notes}` : '';
}
