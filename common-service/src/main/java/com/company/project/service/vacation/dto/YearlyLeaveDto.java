package com.company.project.service.vacation.dto;

import com.company.project.domain.vacation.AnnualLeave;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class YearlyLeaveDto {
    private String occrrncYear;
    private String userId;
    private Double yrycOccrrncCo;
    private Double useYrycCo;
    private Double remndrYrycCo;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static YearlyLeaveDto from(AnnualLeave entity) {
        if (entity == null)
            return null;
        return YearlyLeaveDto.builder()
                .occrrncYear(entity.getOccrrncYear())
                .userId(entity.getUserId())
                .yrycOccrrncCo(entity.getOccrncYrycCo())
                .useYrycCo(entity.getUseYrycCo())
                .remndrYrycCo(entity.getRemndrYrycCo())
                .frstRegisterId(entity.getFrstRegisterId())
                .build();
    }
}