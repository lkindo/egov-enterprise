package nuri.business.service.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "비밀번호 변경 요청 DTO")
public class PasswordChangeRequest {

    @NotBlank(message = "기존 비밀번호는 필수입니다")
    @Schema(description = "기존 비밀번호")
    private String oldPassword;

    @NotBlank(message = "새 비밀번호는 필수입니다")
    // [2026-09-25 DIP S5] 등록·가입·관리자 초기화와 같은 규칙(PasswordPolicy)이다.
    @Size(min = nuri.business.service.user.PasswordPolicy.MIN_LENGTH, max = nuri.business.service.user.PasswordPolicy.MAX_LENGTH, message = nuri.business.service.user.PasswordPolicy.LENGTH_MESSAGE)
    @Pattern(regexp = nuri.business.service.user.PasswordPolicy.PATTERN, message = nuri.business.service.user.PasswordPolicy.PATTERN_MESSAGE)
    @Schema(description = "새 비밀번호 — 8~64자, 영문·숫자·특수문자 각 1자 이상, 공백 불가")
    private String newPassword;
}
