package com.company.project.service.hld.dto;

import com.company.project.domain.holiday.Holiday;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HolidayDto {
    private Integer restdeNo;
    private String restdeDe;
    private String restdeNm;
    private String restdeDc;
    private String restdeSe;
    private String restdeSeCode;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static HolidayDto from(Holiday entity) {
        if (entity == null) return null;
        return HolidayDto.builder()
                .restdeNo(entity.getRestdeNo())
                .restdeDe(entity.getRestdeDe())
                .restdeNm(entity.getRestdeNm())
                .restdeDc(entity.getRestdeDc())
                .restdeSe(entity.getRestdeSe())
                .restdeSeCode(entity.getRestdeSeCode())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
