package nuri.business.service.informalsanction.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 임시저장한 기안 하나(2026-10-03 D3). 결재선의 사람마다 지금 결재자로 고를 수 있는지를 싣는다 — 저장한 뒤 사용 중지됐거나
 * 결재 권한을 잃은 사람은 사유와 함께 돌아오고, 상신 전 사전 확인이 상신을 막는다. 사용 중이 아니거나 없는 계정은
 * 이름을 싣지 않는다(저장은 임의 식별자를 받으므로 이름을 알아내는 경로가 되지 않게 한다).
 *
 * @param references 임시저장한 참조자(2026-10-04 D4). 사람마다 지금 참조자로 고를 수 있는지(사용 중·결재 조회 권한)를
 *                   {@link ApproverProfileDto#referenceEligible()} 로 싣고, 같은 공개 수준을 지킨다
 */
public record ApprovalTemporaryDraftDto(Long temporaryDraftSn, String taskSeCd, String taskSeNm, String docTtl,
                                        String docCn, List<ApprovalLineStageDto> stages,
                                        List<ApproverProfileDto> references, Integer version,
                                        LocalDateTime mdfcnDt) {
}
