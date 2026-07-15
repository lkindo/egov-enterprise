package nuri.business.domain.user.dto;

import jakarta.validation.constraints.*;

import lombok.Builder;

@Builder
public record UserAbsenceDto(
    @Size(max = 20)
    @NotBlank
    String userId,

    String userAbsnYn
) {
}
