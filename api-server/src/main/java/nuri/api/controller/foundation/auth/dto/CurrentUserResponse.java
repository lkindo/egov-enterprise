package nuri.api.controller.foundation.auth.dto;

/**
 * 현재 로그인 사용자 정보(/api/v1/auth/me) 응답 DTO.
 *
 * <p>해당 엔드포인트가 ad-hoc {@code Map<String, Object>}를 반환하던 것을
 * 백엔드 헌법 제3조(레이어 간 격리 — DTO 전문 클래스 반환)에 맞춰 대체한다.
 * JSON 필드명(id, name, role, userSe, email)은 기존 응답 계약과 동일하게 유지한다.
 */
public record CurrentUserResponse(
        String id,
        String name,
        String role,
        String userSe,
        String email
) {
}
