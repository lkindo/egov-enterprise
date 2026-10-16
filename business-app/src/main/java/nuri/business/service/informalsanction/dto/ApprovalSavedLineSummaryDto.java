package nuri.business.service.informalsanction.dto;

import java.time.LocalDateTime;

/**
 * 나의 결재선 목록 한 줄(2026-10-16 D2). 결재자는 싣지 않고 단계·사람 수만 싣는다 — 불러오기가 단건 조회로 지금 자격을 판정한다.
 * 저장(등록·수정) 응답도 이 모양이다.
 *
 * @param stageCount    저장한 단계 수
 * @param approverCount 저장한 결재자 수(그 뒤 자격을 잃은 사람도 센다 — 불러올 때 빠진 수를 따로 알린다)
 */
public record ApprovalSavedLineSummaryDto(Long savedLineSn, String aplnNm, int stageCount, int approverCount,
                                          LocalDateTime mdfcnDt) {
}
