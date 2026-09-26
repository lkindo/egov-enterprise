package nuri.business.service.user.dto;

import java.util.List;

/**
 * 부서 단위 수신자 선택용 소속 인원(2026-09-27 DIP B5 F5).
 *
 * <p>항목은 {@link UserSearchDto} 다 — 발송 화면이 사람을 고르는 데 필요한 식별자·성명·부서명·부재뿐이며 연락처는 싣지 않는다.
 * 관리자 사용자 목록({@code UserDto})을 재사용하지 않는 이유는 그 레코드가 연락처·주소·생년월일까지 실어 개인정보 접근으로
 * 기록되기 때문이다 — 수신자 한 부서를 고르는 일은 인적사항 열람이 아니다.</p>
 *
 * @param members   사용 중(P) 계정인 직속 소속 인원(하위 부서는 포함하지 않는다). 성명 순.
 * @param truncated 상한을 넘어 일부만 담았는가. 참이면 화면이 전원이 아님을 알린다.
 */
public record DepartmentRecipientsDto(List<UserSearchDto> members, boolean truncated) {
}
