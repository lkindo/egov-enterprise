package nuri.business.service.auth.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import nuri.foundation.security.service.CustomUserDetails;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@Schema(description = "토큰 응답 DTO")
public class TokenResponse {
    @Schema(description = "Access Token", example = "eyJhbGciOiJIUzI1NiJ9...")
    private String accessToken;

    // [Phase 3 계약 축소] refreshToken 은 응답 바디에 노출하지 않는다 — HttpOnly Set-Cookie 로만 전달해
    // XSS 시 재발급 토큰 탈취면을 제거한다. 컨트롤러가 getRefreshToken() 으로 읽어 쿠키를 발급하므로 필드는 유지.
    @JsonIgnore
    @Schema(hidden = true)
    private String refreshToken;

    @Schema(description = "표시 호환용 권한 코드. 인가 판단에는 permissions를 사용한다.", example = "ROLE_USER")
    private String role;

    @Builder.Default
    private List<String> groups = List.of();
    @Builder.Default
    private List<String> permissions = List.of();
    private String authorizationVersion;

    public TokenResponse(String accessToken, String refreshToken, String role) {
        this(accessToken, refreshToken, role, List.of(), List.of(), null);
    }

    public TokenResponse(String accessToken, String refreshToken, String role, List<String> groups,
                         List<String> permissions, String authorizationVersion) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.role = role;
        this.groups = groups == null ? List.of() : List.copyOf(groups);
        this.permissions = permissions == null ? List.of() : List.copyOf(permissions);
        this.authorizationVersion = authorizationVersion;
    }

    public static TokenResponse from(String accessToken, String refreshToken, CustomUserDetails principal) {
        return new TokenResponse(accessToken, refreshToken, principal.getAuthorCode(),
                principal.getGroups(), principal.getPermissions(), principal.getAuthorizationVersion());
    }
}
