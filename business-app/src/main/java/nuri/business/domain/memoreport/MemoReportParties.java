package nuri.business.domain.memoreport;

/**
 * 메모보고의 당사자(작성자·수신자 esntlId) — 상세 조회가 행을 잠그기 전에 거절할 요청을 거르고 잠금 방식을 고르는 데 쓴다
 * (2026-11-25 품질 평가). 최종 인가는 잠근 행으로 다시 한다.
 *
 * @param authorId    작성자 esntlId({@code user_id})
 * @param recipientId 수신자 esntlId({@code rptr_id}, NOT NULL — 등록 뒤 바뀌지 않는다)
 */
public record MemoReportParties(String authorId, String recipientId) {
}
