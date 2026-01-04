package com.company.project.service.holiday.dto;

import com.company.project.domain.holiday.Holiday;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 휴일 DTO
 */
@Getter
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
    private String formattedRestdeDe;

    public static HolidayDto from(Holiday entity) {
        return HolidayDto.builder()
                .restdeNo(entity.getRestdeNo())
                .restdeDe(entity.getRestdeDe())
                .restdeNm(entity.getRestdeNm())
                .restdeDc(entity.getRestdeDc())
                .restdeSe(entity.getRestdeSe())
                .restdeSeCode(entity.getRestdeSeCode())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .formattedRestdeDe(entity.getFormattedRestdeDe())
                .build();
    }
}
