package com.company.project.service.vacation.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnnualLeaveDto {
    private String userId;
    private String occrrncYear;
    private double occrncYrycCo;
    private double useYrycCo;
    private double remndrYrycCo;

    // Additional Fields for View
    private String userNm;
    private String orgnztNm;
}
