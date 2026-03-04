package com.company.project.service.vacation.dto;

import com.company.project.domain.user.entity.UserAbsence;
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

    public static UserAbsenceDto from(UserAbsence entity) {
        if (entity == null)
            return null;
        return UserAbsenceDto.builder()
                .userId(entity.getUserId())
                .userAbsnceAt(entity.getUserAbsnceAt())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdateDate(entity.getLastModifiedDate())
                .build();
    }
}