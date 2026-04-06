package nuri.foundation.domain.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserAbsenceDto {
    private String emplyrId;
    private String userAbsnceAt;
}
