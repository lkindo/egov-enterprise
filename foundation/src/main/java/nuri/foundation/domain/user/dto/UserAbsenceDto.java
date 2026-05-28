package nuri.foundation.domain.user.dto;

import jakarta.validation.constraints.*;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserAbsenceDto {
    @Size(max = 20)
    @NotBlank
    private String userId;
    private String userAbsnceAt;

    // legacy
    public String getEmplyrId() { return userId; }
}
