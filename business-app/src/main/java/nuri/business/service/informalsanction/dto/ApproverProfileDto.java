package nuri.business.service.informalsanction.dto;

/**
 * 결재자·참조자로 고를 수 있는지 미리 알려 주는 사람 요약(2026-10-03 결재 동선 개선, 참조자 판정은 2026-10-04 D4).
 *
 * <p>항목은 사용자 검색과 같은 최소 필드(이름·부서명·부재)이며 연락처는 싣지 않는다. 사용 중이 아닌 계정과 없는
 * 계정은 이름·부서를 비우고 사유만 돌려준다 — 식별자로 비활성 계정의 이름을 알아내는 경로를 만들지 않는다.
 *
 * <p>결재자 판정과 참조자 판정을 함께 싣는다 — 참조자는 결재 권한이 아니라 결재 조회 권한(APPROVAL_READ)과 사용 중 여부로
 * 고른다. 같은 확인 API 에 용도 파라미터를 두지 않고 응답에 둘 다 싣는다. 결재선과의 겹침·이미 참조자인지는 화면이 아는
 * 사실이라 여기서 보지 않는다(상신 때 서버가 다시 본다).
 *
 * @param ineligibleReason          결재자로 고를 수 없는 사유 {@code SELF}·{@code INACTIVE}·{@code NO_PERMISSION}·{@code NOT_FOUND},
 *                                  고를 수 있으면 null
 * @param referenceEligible         참조자로 고를 수 있는가
 * @param referenceIneligibleReason 참조자로 고를 수 없는 사유 {@code SELF}·{@code INACTIVE}·{@code NO_READ_PERMISSION}·
 *                                  {@code NOT_FOUND}, 고를 수 있으면 null
 */
public record ApproverProfileDto(String esntlId, String userNm, String deptNm, boolean absent,
                                 boolean eligible, String ineligibleReason,
                                 boolean referenceEligible, String referenceIneligibleReason) {
}
