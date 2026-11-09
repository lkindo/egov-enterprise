export const context = { snapshotDigest: 'synthetic-ai-context', commit: 'synthetic', capabilities: [], screens: [], interfaces: [], tables: [], gates: [], modules: [], presets: [], permissions: [] };
export const source = { id: 'SRC-1', title: '합성 접수 회의록', sourceType: 'interview', classification: 'internal', locator: '1쪽', clauses: [{ id: 'C-1', text: '담당자는 접수 목록을 조회한다. 열람 범위는 담당자가 결정한다.', locator: '1쪽 1문단', disposition: 'question', requirementIds: [], rationale: '열람 범위 확인' }] };
export function analysis(request, { question = true } = {}) {
  const sources = request.data.sources;
  const citations = sources.flatMap(src => src.clauses.map(clause => ({ sourceId: src.id, clauseId: clause.id, quote: clause.text })));
  const answered = request.data.decisions.length > 0;
  return {
    requirements: [{ id: 'REQ-1', title: '접수 목록 조회', description: answered ? '담당자가 본인 접수 목록을 조회한다.' : '담당자가 접수 목록을 조회한다.', requirementType: 'functional', solutionDisposition: 'gap-dev', moduleCandidates: [], rationale: '회의록과 사용자 결정', nfrCriteria: null, citations }],
    coverage: citations.map(cite => ({ sourceId: cite.sourceId, clauseId: cite.clauseId, disposition: 'included', requirementIds: ['REQ-1'], rationale: '접수 조회 업무와 열람 정책' })),
    issues: question && !answered ? [{ id: 'ISSUE-1', kind: 'decision', severity: 'blocking', question: '접수 열람 범위를 결정해 주세요.', options: ['본인 접수', '부서 접수'], requirementIds: ['REQ-1'], citations: [citations[0]] }] : [],
  };
}
export function decomposition() {
  return { workItems: [{ id: 'EPIC-1', workItemType: 'epic', parentEpicId: null, title: '접수 관리', requirementIds: ['REQ-1'] }, { id: 'STORY-1', workItemType: 'story', parentEpicId: 'EPIC-1', title: '접수 목록 조회', description: '본인 접수 목록', requirementIds: ['REQ-1'], asA: '담당자', iWant: '접수 목록 조회', soThat: '접수 업무 수행', archetype: 'A1', priority: 'MUST', batch: 1, dependsOn: [], decisionCards: ['D-1: A1 목록', 'D-2: 본인 접수 열람, 타인 접수 거부', 'D-3: 실제 물리 스키마와 식별자 실측 후 구현', 'D-4: 페이지 크기와 입력 형식 검증', 'D-5: 빈 목록과 조회 실패 구분'] }], acceptanceCriteria: [{ id: 'AC-ALLOW', workItemId: 'STORY-1', requirementIds: ['REQ-1'], polarity: 'allow', given: '담당자 인증', when: '접수 조회', then: '본인 접수 목록', verificationMethod: 'integration-test' }, { id: 'AC-FORBID', workItemId: 'STORY-1', requirementIds: ['REQ-1'], polarity: 'forbid', given: '타인 접수만 존재', when: '접수 조회', then: '타인 접수를 반환하지 않음', verificationMethod: 'integration-test' }], traceLinks: [{ id: 'TRACE-1', requirementId: 'REQ-1', workItemId: 'STORY-1', acId: 'AC-ALLOW', targetKind: 'screen', targetId: '/synthetic/receipts', linkIntent: 'planned', notes: '새 화면 설계안이며 기존 구현 관측 아님' }], issues: [] };
}
export const envelope = (output, phase = 'analysis') => ({ output, model: 'claude-opus-5-5', effort: phase === 'reading' ? 'xhigh' : 'high', usage: { inputTokens: 1, outputTokens: 1 } });
