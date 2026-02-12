package com.company.project.service.vct.dto;

import com.company.project.domain.notification.IndvdlYrycManage;
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

    public static YearlyLeaveDto from(IndvdlYrycManage entity) {
        if (entity == null) return null;
        return YearlyLeaveDto.builder()
                .occrrncYear(entity.getOccrrncYear())
                .userId(entity.getUserId())
                .yrycOccrrncCo(entity.getYrycOccrrncCo())
                .useYrycCo(entity.getUseYrycCo())
                .remndrYrycCo(entity.getRemndrYrycCo())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
