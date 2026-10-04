package nuri.business.service.informalsanction.dto;

import nuri.business.domain.informalsanction.ApprovalReferenceDesignator;

import java.time.LocalDateTime;

/**
 * 결재 문서의 참조자 한 사람(2026-10-04 D4, 상세만). 숨은 참조가 아니다 — 문서를 읽을 수 있는 사람은 자기가 볼 수 있는 가장
 * 높은 차수까지 지정된 참조자를 사람마다 한 줄로 본다(개정 1). 항목은 사용자 검색과 같은 최소 필드(이름·부서명)이며 연락처는
 * 싣지 않는다.
 *
 * @param atrzCycl     보는 사람에게 보이는 가장 최근 지정의 차수
 * @param designator   그 지정을 기안자가 했는가, 결재자가 더했는가
 * @param designatedAt 그 지정을 한 시각
 */
public record ApprovalReferenceDto(String userId, String userNm, String deptNm, int atrzCycl,
                                   ApprovalReferenceDesignator designator, LocalDateTime designatedAt) {
}
