package com.company.project.service.vacation.dto;

import lombok.*;

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
}
