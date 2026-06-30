package nuri.business.domain.user.dto;

import jakarta.validation.constraints.*;

import lombok.Builder;

import nuri.business.domain.user.entity.UserAbsence;

@Builder
public record UserAbsenceDto(
    @Size(max = 20)
    @NotBlank
    String userId,

    String userAbsnYn
) {
    public static UserAbsenceDto from(UserAbsence entity) {
        if (entity == null) return null;
        return new UserAbsenceDto(entity.getUserId(), entity.getUserAbsnYn());
    }
}
