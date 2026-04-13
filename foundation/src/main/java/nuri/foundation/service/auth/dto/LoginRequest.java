package nuri.foundation.service.auth.dto;

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
    private String userId;

    @Schema(description = "비밀번호", example = "admin123")
    private String password;
}
