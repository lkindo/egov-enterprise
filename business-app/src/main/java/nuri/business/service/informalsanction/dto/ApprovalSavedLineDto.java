package nuri.business.service.informalsanction.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 불러온 나의 결재선 하나(2026-10-16 D2). 지금 결재자로 고를 수 있는 사람만 싣는다 — 저장한 뒤 사용 중지됐거나 결재 권한을
 * 잃은 사람은 이름 없이 빼고 그 수만 알린다(임시저장의 공개 수준과 같다 — 식별자로 비활성 계정의 이름을 알아내는 경로가 되지 않게
 * 한다). 사람이 모두 빠진 단계도 뺀다.
 *
 * @param stages               지금 고를 수 있는 결재자만 남긴 단계
 * @param droppedApproverCount 자격을 잃어 뺀 결재자 수
 * @param droppedStageCount    결재자가 모두 빠져 뺀 단계 수
 */
public record ApprovalSavedLineDto(Long savedLineSn, String aplnNm, List<ApprovalLineStageDto> stages,
                                   int droppedApproverCount, int droppedStageCount, LocalDateTime mdfcnDt) {
}
