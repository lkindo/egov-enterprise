package com.company.project.service.system.dto;

import com.company.project.domain.system.UserAbsence;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAbsenceDto {
    private String userId;
    private String userNm;
    private String userAbsnceAt;
    private String regYn;
    private String createdBy;
    private LocalDateTime createdDate;

    public static UserAbsenceDto from(UserAbsence entity) {
        return UserAbsenceDto.builder()
                .userId(entity.getUserId())
                .userNm(entity.getUserNm())
                .userAbsnceAt(entity.getUserAbsnceAt())
                .regYn(entity.getRegYn())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
