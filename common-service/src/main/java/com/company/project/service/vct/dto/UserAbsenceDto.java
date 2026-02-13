package com.company.project.service.vct.dto;

import com.company.project.domain.vct.UserAbsenceVct;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAbsenceDto {
    private String userId;
    private String userAbsnceAt;
    private String lastUpdusrId;
    private LocalDateTime lastUpdateDate;

    public static UserAbsenceDto from(UserAbsenceVct entity) {
        if (entity == null)
            return null;
        return UserAbsenceDto.builder()
                .userId(entity.getUserId())
                .userAbsnceAt(entity.getUserAbsnceAt())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdateDate(entity.getLastUpdateDate())
                .build();
    }
}
