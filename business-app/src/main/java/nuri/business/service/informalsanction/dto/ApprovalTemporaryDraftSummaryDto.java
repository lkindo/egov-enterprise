package nuri.business.service.informalsanction.dto;

import java.time.LocalDateTime;

/**
 * 임시저장한 기안의 목록 한 줄(2026-10-03 D3). 본문과 결재선은 싣지 않는다 — '이어 쓰기' 가 단건 조회로 연다.
 * 저장(등록·수정) 응답도 이 모양이며, 화면은 번호와 버전을 들고 있다가 다음 저장·상신에 싣는다.
 *
 * @param taskSeNm 업무 구분 이름. 지금 쓰지 않는 코드면 빈 문자열이다
 * @param approverCount 결재선에 든 사람 수
 * @param referenceCount 참조자 수(2026-10-04 D4)
 */
public record ApprovalTemporaryDraftSummaryDto(Long temporaryDraftSn, String taskSeCd, String taskSeNm, String docTtl,
                                               int approverCount, int referenceCount, Integer version,
                                               LocalDateTime mdfcnDt) {
}
