package nuri.business.service.user.dto;

/**
 * 담당자 지정용 사용자 검색 결과 항목. <b>의도적으로 최소 필드만</b> 노출한다.
 *
 * <p><b>왜 {@link UserDto} 를 재사용하지 않는가</b> — UserDto 는 관리자 화면용 전체 인적사항
 * 레코드다. {@code homeAddr}·{@code mblTelno}·{@code emlAddr}·{@code brthYmd}·{@code gndrCd}·
 * {@code zip}·{@code faxNo} 등 개인정보가 그대로 실려 있어, 이 DTO 를 일반 사용자에게 열리는
 * 검색 창구에 재사용하면 전 직원 인명부가 통째로 새어 나간다.
 * 그래서 별도 DTO 를 두고 <b>담당자 지정에 실제로 필요한 3개 필드</b>만 담는다.</p>
 *
 * <p><b>필드를 추가할 때는 반드시 다시 생각하라.</b> 이 레코드에 필드를 하나 더 넣는 것은
 * 곧 "모든 로그인 사용자에게 그 정보를 공개한다"는 결정이다. "있으면 편하니까"는 사유가 되지
 * 못한다. 연락처·이메일·주민번호·주소·생년월일은 어떤 경우에도 여기에 들어오지 않는다.</p>
 *
 * @param esntlId 사용자 PK. {@code DeptJob.picId} 가 저장하는 축이 esntlId 이므로
 *                (참조: {@code DeptJobService#toDto} 의 {@code findByEsntlId}) 화면은 이 값을 그대로 담는다.
 *                loginId 를 주면 담당자 이름이 조용히 비는 정체성 축 함정에 빠진다.
 * @param userNm  표시용 성명.
 * @param deptNm  소속 부서명. 동명이인을 구분할 수단이 없으면 담당자를 잘못 고르게 되므로 포함한다
 *                (편의가 아니라 오지정 방지 목적). 소속 미지정 사용자는 {@code null}.
 */
public record UserSearchDto(
        String esntlId,
        String userNm,
        String deptNm) {
}
