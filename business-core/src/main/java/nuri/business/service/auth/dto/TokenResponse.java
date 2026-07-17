package nuri.business.service.auth.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "토큰 응답 DTO")
public class TokenResponse {
    @Schema(description = "Access Token", example = "eyJhbGciOiJIUzI1NiJ9...")
    private String accessToken;

    // [Phase 3 계약 축소] refreshToken 은 응답 바디에 노출하지 않는다 — HttpOnly Set-Cookie 로만 전달해
    // XSS 시 재발급 토큰 탈취면을 제거한다. 컨트롤러가 getRefreshToken() 으로 읽어 쿠키를 발급하므로 필드는 유지.
    @JsonIgnore
    @Schema(hidden = true)
    private String refreshToken;

    @Schema(description = "User Role", example = "ROLE_USER")
    private String role;
}
