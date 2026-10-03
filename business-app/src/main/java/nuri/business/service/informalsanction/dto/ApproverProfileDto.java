package nuri.business.service.informalsanction.dto;

/**
 * 결재자로 고를 수 있는지 미리 알려 주는 사람 요약(2026-10-03 결재 동선 개선).
 *
 * <p>항목은 사용자 검색과 같은 최소 필드(이름·부서명·부재)이며 연락처는 싣지 않는다. 사용 중이 아닌 계정과 없는
 * 계정은 이름·부서를 비우고 사유만 돌려준다 — 식별자로 비활성 계정의 이름을 알아내는 경로를 만들지 않는다.
 *
 * @param ineligibleReason {@code SELF}·{@code INACTIVE}·{@code NO_PERMISSION}·{@code NOT_FOUND}, 고를 수 있으면 null
 */
public record ApproverProfileDto(String esntlId, String userNm, String deptNm, boolean absent,
                                 boolean eligible, String ineligibleReason) {
}
