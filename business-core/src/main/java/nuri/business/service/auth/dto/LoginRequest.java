package nuri.business.service.auth.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "로그인 요청 DTO")
public class LoginRequest {
    @Schema(description = "사용자 아이디", example = "admin")
    @Size(max = 20)
    @NotBlank
    private String userId;

    @Schema(description = "비밀번호", example = "admin123")
    private String password;

    @Schema(description = "OTP 번호 (선택)", example = "123456")
    private Integer otpCode;
}
