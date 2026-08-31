package nuri.api.controller.foundation.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 현재 로그인 사용자 정보(/api/v1/auth/me) 응답 DTO.
 *
 * <p>해당 엔드포인트가 ad-hoc {@code Map<String, Object>}를 반환하던 것을
 * 백엔드 헌법 제3조(레이어 간 격리 — DTO 전문 클래스 반환)에 맞춰 대체한다.
 * {@code id}는 사람이 입력하는 loginId이고, {@code esntlId}는 Board처럼 내부 PK를
 * 소유권 축으로 쓰는 도메인에서 현재 사용자 본인 여부를 판정할 때만 사용하는 불투명 식별자다.
 * 비밀번호·토큰·인증 자격은 이 DTO에 포함하지 않는다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CurrentUserResponse(
        String id,
        String esntlId,
        String name,
        String role,
        String userSe,
        String email
) {
}
