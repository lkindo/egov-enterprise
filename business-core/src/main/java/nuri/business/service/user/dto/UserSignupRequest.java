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
    @Size(min = 8, max = 20, message = "비밀번호는 8~20자여야 합니다")
    @Pattern(regexp = "^(?=.*[a-zA-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$", message = "비밀번호는 영문, 숫자, 특수문자를 포함하여 8자 이상이어야 합니다")
    @Schema(description = "비밀번호", example = "password123!")
    private String pswd;
 
    @NotBlank(message = "사용자명은 필수입니다")
    @Pattern(regexp = "^[a-zA-Z0-9가-힣\\s]{2,50}$", message = "사용자명은 2~50자의 영문, 숫자, 한글만 가능합니다")
    @Schema(description = "사용자 이름", example = "홍길동")
    private String userNm;


    @Schema(description = "비밀번호 힌트")
    private String pswdHint;

    @Schema(description = "비밀번호 정답")
    private String pswdCrans;

    // [보안] role 필드를 두지 않는다. 이 DTO 는 미인증 공개 엔드포인트(POST /api/v1/users/signup)의
    //   요청 본문이며, 여기에 권한을 받으면 요청 1건으로 ROLE_ADMIN 자가 발급이 가능해진다.
    //   권한은 UserService.signup() 이 Role.USER 로 고정하고, 관리자 계정 생성은
    //   SecurityUtil.assertAdmin() 이 걸린 registerUser(POST /api/v1/admin/system/users) 경로만 사용한다.
    //   @JsonIgnore 나 주석 처리로 대체하지 말 것 — 필드가 존재하면 빌더·매핑 경로로 되살아난다.
    //   재발 방지 게이트: SignupContractLinterTest (api-server harness, pre-push 실행).
}
