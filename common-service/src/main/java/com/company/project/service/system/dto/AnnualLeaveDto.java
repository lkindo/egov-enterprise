package com.company.project.service.system.dto;

import com.company.project.domain.system.AnnualLeave;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnnualLeaveDto {
    private String occrrncYear;
    private String usid;
    private Double occrncYrycCo;
    private Double useYrycCo;
    private Double remndrYrycCo;
    private String createdBy;
    private LocalDateTime createdDate;

    public static AnnualLeaveDto from(AnnualLeave entity) {
        return AnnualLeaveDto.builder()
                .occrrncYear(entity.getOccrrncYear())
                .usid(entity.getUsid())
                .occrncYrycCo(entity.getOccrncYrycCo())
                .useYrycCo(entity.getUseYrycCo())
                .remndrYrycCo(entity.getRemndrYrycCo())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
