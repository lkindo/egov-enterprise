package nuri.foundation.service.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "관리자용 비밀번호 변경 요청")
public record AdminPasswordChangeRequest(
    @NotBlank(message = "새 비밀번호는 필수입니다")
    @Size(min = 8, max = 20, message = "새 비밀번호는 8~20자여야 합니다")
    @Schema(description = "새 비밀번호")
    String newPassword
) {}
