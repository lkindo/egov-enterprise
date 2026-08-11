package nuri.business.service.user.dto;

/**
 * {@link UserDto} 의 Bean Validation 그룹.
 *
 * <p>[왜 필요한가 — 2026-08-11 확인된 결함]
 * {@code UserDto} 는 <b>등록·수정 세 엔드포인트가 공유</b>한다:
 * <ul>
 *   <li>{@code POST /admin/system/users} (등록) — 비밀번호가 <b>필수</b>다.
 *       {@code UserService.registerUser(…, dto.pswd(), …)} 가 그것을 받아 인코딩·저장한다.</li>
 *   <li>{@code PUT  /admin/system/users/{userId}} (관리자 수정)</li>
 *   <li>{@code PUT  /users/me} (내 프로필 수정)</li>
 * </ul>
 * 그런데 {@code UserService.updateUser} 는 <b>비밀번호를 한 번도 읽지 않는다</b> —
 * 소비 필드는 userNm·emplNo·연락처·주소·소속 계열 16개뿐이고, 비밀번호 관련 컬럼은
 * 기존 엔티티 값을 그대로 되쓴다({@code user.getPswdHint()}, {@code user.getPswdCrans()}).
 * 비밀번호 변경은 전용 경로({@code PUT /users/me/password},
 * {@code PATCH /admin/system/users/{userId}/password})의 책임이다.
 *
 * <p>그럼에도 {@code UserDto.pswd} 에 걸린 {@code @NotBlank + @Size(min=8) + @Pattern} 이
 * <b>수정 요청에도 그대로 적용</b>되어, 화면이 비밀번호를 보내지 않는 한 수정은 <b>항상 400</b> 이었다.
 * 프런트 수정 폼은 비밀번호를 선택으로 두고 빈 문자열을 싣는 것이 옳은 설계이므로
 * (변경은 전용 경로 책임), 고쳐야 할 쪽은 <b>서버의 검증 적용 범위</b>다.
 *
 * <p>[해결] 비밀번호 제약을 {@link OnCreate} 그룹에 한정한다. 등록 엔드포인트만
 * {@code @Validated({Default.class, OnCreate.class})} 로 두 그룹을 함께 요구하고,
 * 수정 엔드포인트는 기본 그룹({@code @Valid})만 적용한다.
 *
 * <p>⚠ <b>새 '등록' 엔드포인트를 추가할 때 주의</b>: {@code @Valid} 만 붙이면 비밀번호 제약이
 * <b>조용히 적용되지 않는다</b>(기본 그룹에 없으므로). 반드시
 * {@code @Validated({Default.class, UserValidationGroups.OnCreate.class})} 를 쓸 것.
 * 이 규약은 {@code UserPasswordValidationGroupLinterTest} 가 기계적으로 강제한다 —
 * 그 린터가 없으면 이 주석은 지켜지지 않는 약속일 뿐이다(GEMINI.md §0.7-H5).
 */
public final class UserValidationGroups {

    private UserValidationGroups() {
    }

    /** 사용자 '등록' 경로에서만 적용되는 제약(비밀번호 필수·형식). */
    public interface OnCreate {
    }
}
