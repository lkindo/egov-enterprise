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

    /**
     * [2026-11-21] 빈 값·초장문은 인증 제공자에 닿기 전에 400 으로 거부한다 — 종전에는 제약이 없어 그런 요청도 계정의 로그인
     * 실패 횟수를 올렸다. 상한은 정책 상한(64자)의 두 배로 두어 정책 이전에 만든 비밀번호를 막지 않는다. 문구는 BFF 가 로그인
     * 실패의 같은 문구로 바꾸므로 계정 상태를 드러내지 않는다.
     */
    @Schema(description = "비밀번호", example = "admin123")
    @NotBlank
    @Size(min = 1, max = MAX_PASSWORD_LENGTH)
    private String password;

    /** 로그인 비밀번호 입력 상한. */
    public static final int MAX_PASSWORD_LENGTH = 128;

    @Schema(description = "OTP 번호 (선택)", example = "123456")
    private Integer otpCode;
}
