package nuri.business.domain.user.dto;

import jakarta.validation.constraints.*;

import lombok.Builder;

@Builder
public record UserAbsenceDto(
    @Size(max = 20)
    @NotBlank
    String userId,

    // [2026-09-22 GAP-CONTRACT-001] 물리 컬럼 1 을 입력에서 보호한다.
    @Size(max = 1)
    String userAbsnYn
) {
}
