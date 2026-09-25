package nuri.business.service.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "관리자용 비밀번호 변경 요청")
public record AdminPasswordChangeRequest(
    @NotBlank(message = "새 비밀번호는 필수입니다")
    // [2026-09-25 DIP S5] 등록·가입·본인 변경과 같은 규칙(PasswordPolicy)이다. 종전에는 길이만 봐
    //   등록 때 막힌 약한 비밀번호가 관리자 초기화로는 들어갔다.
    @Size(min = nuri.business.service.user.PasswordPolicy.MIN_LENGTH, max = nuri.business.service.user.PasswordPolicy.MAX_LENGTH, message = nuri.business.service.user.PasswordPolicy.LENGTH_MESSAGE)
    @Pattern(regexp = nuri.business.service.user.PasswordPolicy.PATTERN, message = nuri.business.service.user.PasswordPolicy.PATTERN_MESSAGE)
    @Schema(description = "새 비밀번호 — 8~64자, 영문·숫자·특수문자 각 1자 이상, 공백 불가")
    String newPassword
) {}
