package nuri.business.service.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "회원가입 요청 DTO")
public class UserSignupRequest {
    @NotBlank(message = "아이디는 필수입니다")
    @Size(min = 4, max = 20, message = "아이디는 4~20자여야 합니다")
    @Pattern(regexp = "^[a-zA-Z0-9]+$", message = "아이디는 영문과 숫자만 가능합니다")
    @Schema(description = "사용자 아이디", example = "newuser")
    private String userId;

    @NotBlank(message = "비밀번호는 필수입니다")
    // [2026-09-25 DIP S5] 공용 규칙(PasswordPolicy) — 네 경로가 같은 길이·조합·특수문자 집합을 쓴다.
    @Size(min = nuri.business.service.user.PasswordPolicy.MIN_LENGTH, max = nuri.business.service.user.PasswordPolicy.MAX_LENGTH, message = nuri.business.service.user.PasswordPolicy.LENGTH_MESSAGE)
    @Pattern(regexp = nuri.business.service.user.PasswordPolicy.PATTERN, message = nuri.business.service.user.PasswordPolicy.PATTERN_MESSAGE)
    @Schema(description = "비밀번호", example = "password123!")
    private String pswd;
 
    @NotBlank(message = "사용자명은 필수입니다")
    @Pattern(regexp = "^[a-zA-Z0-9가-힣\\s]{2,50}$", message = "사용자명은 2~50자의 영문, 숫자, 한글만 가능합니다")
    @Schema(description = "사용자 이름", example = "홍길동")
    private String userNm;


    @Schema(description = "비밀번호 힌트")
    @Size(max = 300)
    private String pswdHint;

    @Schema(description = "비밀번호 정답")
    @Size(max = 300)
    private String pswdCrans;

    // [보안] role 필드를 두지 않는다. 이 DTO 는 POST /api/v1/users/signup 의 요청 본문이다. 이 경로는
    //   DEC-OPS-135 이후 USER_CREATE 권한자만 부를 수 있지만, 여기에 권한을 받으면 계정 등록 권한만으로
    //   요청 1건에 ROLE_ADMIN 을 발급하는 경로가 된다. 권한은 UserService.signup() 이 Role.USER 로 고정하고,
    //   관리자 등록 registerUser(POST /api/v1/admin/system/users, SecurityUtil.assertPermission("USER_CREATE"))도
    //   USER 로만 만든다. 추가 그룹은 버전 검증된 권한 배정 API(AUTHRT_ASSIGN)로만 부여한다.
    //   @JsonIgnore 나 주석 처리로 대체하지 말 것 — 필드가 존재하면 빌더·매핑 경로로 되살아난다.
    //   재발 방지 게이트: SignupContractLinterTest (api-server harness, pre-push 실행).
}
