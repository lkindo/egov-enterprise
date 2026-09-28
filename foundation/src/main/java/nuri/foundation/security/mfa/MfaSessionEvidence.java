package nuri.foundation.security.mfa;

import java.time.Instant;

/** 서명 검증한 JWT의 MFA 증거. 도전 토큰은 이 타입으로 승격하지 않는다. */
public record MfaSessionEvidence(String credentialVersion, Instant verifiedAt) {}
