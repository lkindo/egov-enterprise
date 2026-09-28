package nuri.api.controller.foundation.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nuri.api.controller.foundation.auth.dto.*;
import nuri.business.service.auth.AuthService;
import nuri.business.service.auth.dto.TokenResponse;
import nuri.business.service.auth.mfa.MfaService;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.security.net.ClientIpResolver;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/mfa")
@RequiredArgsConstructor
public class MfaApiController {
    private final MfaService mfa;
    private final AuthService auth;
    private final JwtTokenProvider jwt;
    private final ClientIpResolver clientIps;

    @GetMapping("/status")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.MfaApiController#mfaStatus')")
    public ApiResponse<MfaStatusResponse> mfaStatus(HttpServletResponse response) {
        noStore(response);
        var status = mfa.status();
        return ApiResponse.success(new MfaStatusResponse(status.enabled(), status.required(), status.available(), status.recoveryCodesRemaining()));
    }

    @PostMapping("/enrollment/start")
    @nuri.foundation.core.annotation.SensitiveOperation("MFA 등록 시작")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.MfaApiController#mfaStartEnrollment')")
    public ApiResponse<MfaEnrollmentResponse> mfaStartEnrollment(@Valid @RequestBody MfaPasswordRequest body,
            HttpServletResponse response) {
        noStore(response);
        return enrollment(mfa.startEnrollment(body.password()));
    }

    @PostMapping("/enrollment/prepare")
    @nuri.foundation.core.annotation.SensitiveOperation("제한 도전을 통한 MFA 등록 준비")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.MfaApiController#mfaPrepareEnrollment')")
    public ApiResponse<MfaEnrollmentResponse> mfaPrepareEnrollment(@Valid @RequestBody MfaChallengeRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        noStore(response);
        return enrollment(mfa.prepareEnrollment(body.challengeToken(), clientIps.resolve(request)));
    }

    @PostMapping("/enrollment/confirm")
    @nuri.foundation.core.annotation.SensitiveOperation("MFA 등록 확인")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.MfaApiController#mfaConfirmEnrollment')")
    public ApiResponse<TokenResponse> mfaConfirmEnrollment(@Valid @RequestBody MfaCodeRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        return complete(auth.confirmMfaEnrollment(body.challengeToken(), body.code(), clientIps.resolve(request)), response);
    }

    @PostMapping("/verify")
    @nuri.foundation.core.annotation.SensitiveOperation("MFA 로그인 확인")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.MfaApiController#mfaVerifyLogin')")
    public ApiResponse<TokenResponse> mfaVerifyLogin(@Valid @RequestBody MfaLoginVerificationRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        return complete(auth.verifyMfaLogin(body.challengeToken(), body.code(), body.recoveryCode(), clientIps.resolve(request)), response);
    }

    @PostMapping("/reauthenticate")
    @nuri.foundation.core.annotation.SensitiveOperation("MFA 민감 작업 재인증")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.MfaApiController#mfaReauthenticate')")
    public ApiResponse<MfaReauthenticationResponse> mfaReauthenticate(@Valid @RequestBody MfaReauthenticationRequest body,
            HttpServletResponse response) {
        noStore(response);
        var result = mfa.reauthenticate(body.password(), body.code());
        return ApiResponse.success(new MfaReauthenticationResponse(result.reauthToken(), result.expiresAt()));
    }

    @PostMapping("/recovery-codes")
    @nuri.foundation.core.annotation.SensitiveOperation("MFA 복구코드 재발급")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.MfaApiController#mfaRegenerateRecoveryCodes')")
    public ApiResponse<TokenResponse> mfaRegenerateRecoveryCodes(@Valid @RequestBody MfaReauthProofRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        return complete(auth.regenerateMfaRecoveryCodes(body.reauthToken(), clientIps.resolve(request)), response);
    }

    @PostMapping("/disable")
    @nuri.foundation.core.annotation.SensitiveOperation("MFA 해제")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.MfaApiController#mfaDisable')")
    public ApiResponse<Void> mfaDisable(@Valid @RequestBody MfaReauthProofRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        noStore(response);
        mfa.disable(body.reauthToken(), clientIps.resolve(request));
        jwt.removeRefreshTokenCookie(response);
        return ApiResponse.success(null);
    }

    @PostMapping("/recovery/admin")
    @nuri.foundation.core.annotation.SensitiveOperation("관리자 승인 MFA 복구")
    @PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.foundation.auth.MfaApiController#mfaRecoverAccount')")
    public ApiResponse<Void> mfaRecoverAccount(@Valid @RequestBody MfaRecoveryApprovalRequest body,
            HttpServletRequest request, HttpServletResponse response) {
        noStore(response);
        mfa.recoverAccount(body.reauthToken(), body.esntlId(), body.verificationReference(), clientIps.resolve(request));
        return ApiResponse.success(null);
    }

    private static ApiResponse<MfaEnrollmentResponse> enrollment(nuri.business.service.auth.mfa.MfaResults.Enrollment enrollment) {
        return ApiResponse.success(new MfaEnrollmentResponse(enrollment.secret(), enrollment.otpauthUri(),
                enrollment.challengeToken(), enrollment.expiresAt()));
    }

    private ApiResponse<TokenResponse> complete(TokenResponse result, HttpServletResponse response) {
        noStore(response);
        if (result.getRefreshToken() != null) jwt.addRefreshTokenCookie(response, result.getRefreshToken());
        else jwt.removeRefreshTokenCookie(response);
        return ApiResponse.success(result);
    }

    private static void noStore(HttpServletResponse response) { response.setHeader("Cache-Control", "no-store"); }
}
