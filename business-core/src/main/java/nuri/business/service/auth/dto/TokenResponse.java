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
    @Builder.Default
    @Schema(allowableValues = {"AUTHENTICATED", "MFA_REQUIRED", "ENROLLMENT_REQUIRED"})
    private String authenticationStage = "AUTHENTICATED";
    @Schema(description = "제한 인증 도전. 브라우저 BFF는 HttpOnly 쿠키에 보관하며 JSON으로 전달하지 않는다.")
    private String mfaChallenge;
    private java.time.Instant mfaChallengeExpiresAt;
    @Builder.Default
    private List<String> recoveryCodes = List.of();

    public TokenResponse(String accessToken, String refreshToken, String role) {
        this(accessToken, refreshToken, role, List.of(), List.of(), null);
    }

    public TokenResponse(String accessToken, String refreshToken, String role, List<String> groups,
                         List<String> permissions, String authorizationVersion) {
        this(accessToken, refreshToken, role, groups, permissions, authorizationVersion,
                "AUTHENTICATED", null, null, List.of());
    }

    public TokenResponse(String accessToken, String refreshToken, String role, List<String> groups,
                         List<String> permissions, String authorizationVersion, String authenticationStage,
                         String mfaChallenge, java.time.Instant mfaChallengeExpiresAt, List<String> recoveryCodes) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.role = role;
        this.groups = groups == null ? List.of() : List.copyOf(groups);
        this.permissions = permissions == null ? List.of() : List.copyOf(permissions);
        this.authorizationVersion = authorizationVersion;
        this.authenticationStage = authenticationStage;
        this.mfaChallenge = mfaChallenge;
        this.mfaChallengeExpiresAt = mfaChallengeExpiresAt;
        this.recoveryCodes = recoveryCodes == null ? List.of() : List.copyOf(recoveryCodes);
    }

    public static TokenResponse from(String accessToken, String refreshToken, CustomUserDetails principal) {
        return new TokenResponse(accessToken, refreshToken, principal.getAuthorCode(),
                principal.getGroups(), principal.getPermissions(), principal.getAuthorizationVersion());
    }

    public static TokenResponse challenge(nuri.business.service.auth.mfa.MfaResults.Challenge challenge) {
        return new TokenResponse(null, null, null, List.of(), List.of(), null,
                challenge.stage(), challenge.token(), challenge.expiresAt(), List.of());
    }

    public TokenResponse withRecoveryCodes(List<String> codes) {
        this.recoveryCodes = List.copyOf(codes);
        return this;
    }
}
