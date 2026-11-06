import { analysis, decomposition } from './ai.mjs';

// Synthetic protocol fixture. Actual model quality is evaluated separately.
export function pipelineReply(request, { blocking = false } = {}) {
  switch (request.phase) {
    case 'reading': return { documentTypes: ['interview'], summary: '담당자의 접수 조회 책임과 본인 열람 범위를 설명한다.', blocks: request.data.units.map(unit => ({ inputId: unit.id, heading: '접수 조회', kind: 'paragraph', text: unit.text ? null : unit.nativeReference || '담당자는 본인 접수 목록을 조회한다.', certainty: 'clear', note: '조회 책임과 범위의 원문' })), unreadable: [] };
    case 'synthesis': {
      const ids = request.data.documents.map(doc => doc.sourceId);
      return { summary: '담당자의 접수 조회 업무 흐름을 통합한다.', actors: [{ name: '담당자', responsibility: '접수 조회', sourceIds: ids }], processes: [{ name: '접수 조회', trigger: '담당자의 조회 요청', steps: ['접수 조회', '결과 확인'], exceptions: [], rules: ['본인 담당 범위'], data: ['접수 목록'], sourceIds: ids }], terms: [], sourceCoverage: ids.map(sourceId => ({ sourceId, role: 'business', rationale: '접수 조회 업무의 근거' })), issues: [] };
    }
    case 'analysis': return analysis(request, { question: blocking });
    case 'review-requirements': return { issues: [], revisions: [] };
    case 'decomposition': return decomposition();
    case 'review-plan': return { issues: [], workItemUpdates: [], acceptanceUpdates: [], traceUpdates: [] };
    default: throw Error(`Unexpected synthetic phase ${request.phase}`);
  }
}
