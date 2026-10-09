// 자동 포함: 경로 사슬과 사용자 문장, 해제 방법을 보이고 개발자 근거(종류·파일)는 한 번 더 접는다(E2).
export function renderInclusions({ host, text, label, onDrop }, notes) {
  // 같은 구성을 다시 확인해도 사용자가 펼친 설명과 키보드 포커스는 그 자리에 남긴다.
  const opened = new Set([...host.querySelectorAll('details[open]')].map(node => node.dataset.key));
  const focusKey = host.contains(document.activeElement) ? document.activeElement.dataset.key : undefined;
  const keyed = (element, key) => { element.dataset.key = key; return element; };
  host.replaceChildren();
  if (!notes.length) return;
  host.append(text('p', `함께 포함되는 기능 ${notes.length}개`, 'font-semibold'));
  for (const note of notes) {
    const item = text('div', '', 'rounded-xl border border-dashed border-line p-3');
    item.id = `auto-${note.domain}`;
    const title = text('p', note.label, 'font-medium');
    title.append(text('span', '자동 포함', 'ml-2 text-xs font-normal text-muted'));
    item.append(title, text('p', note.path, 'text-xs text-muted'));
    const why = keyed(document.createElement('details'), `why-${note.domain}`);
    why.className = 'mt-2';
    why.open = opened.has(why.dataset.key);
    why.append(keyed(text('summary', '왜 포함됐나', 'cursor-pointer text-xs font-semibold'), `why-summary-${note.domain}`));
    const steps = text('ul', '', 'mt-2 space-y-1 text-xs');
    steps.append(...note.steps.map(step => text('li', step.text)));
    const removal = text('p', note.removal, 'mt-2 text-xs');
    removal.id = `removal-${note.domain}`;
    const drop = keyed(text('button', `${note.roots.map(label).join(', ')} 해제하기`,
      'mt-2 rounded-lg border border-line px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50'), `drop-${note.domain}`);
    drop.type = 'button';
    drop.setAttribute('aria-describedby', removal.id);
    drop.addEventListener('click', () => onDrop(note.roots));
    const evidence = keyed(document.createElement('details'), `evidence-${note.domain}`);
    evidence.className = 'mt-2';
    evidence.open = opened.has(evidence.dataset.key);
    evidence.append(keyed(text('summary', '개발자 근거', 'cursor-pointer text-xs text-muted'), `evidence-summary-${note.domain}`));
    const files = text('ul', '', 'mt-1 space-y-1 text-xs text-muted');
    files.append(...note.steps.map(step => {
      const row = text('li', `${label(step.from)} → ${label(step.to)} · ${step.evidence.join(' · ')}`);
      row.append(...step.files.map(file => text('code', file, 'block break-all font-mono')));
      return row;
    }));
    evidence.append(files);
    why.append(steps, removal, drop, evidence);
    item.append(why);
    host.append(item);
  }
  if (focusKey) host.querySelector(`[data-key="${focusKey}"]`)?.focus({ preventScroll: true });
}
