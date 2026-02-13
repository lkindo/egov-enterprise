package com.company.project.service.system.dto;

import com.company.project.domain.system.Vacation;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VacationDto {
    private String applcntId;
    private String vcatnSe;
    private String bgnde;
    private String endde;
    private String reqstDe;
    private String vcatnResn;
    private String occrrncYear;
    private String noonSe;
    private String sanctnerId;
    private String confmAt;
    private String sanctnDt;
    private String returnResn;
    private String infrmlSanctnId;
    private String createdBy;
    private LocalDateTime createdDate;

    public static VacationDto from(Vacation entity) {
        return VacationDto.builder()
                .applcntId(entity.getApplcntId())
                .vcatnSe(entity.getVcatnSe())
                .bgnde(entity.getBgnde())
                .endde(entity.getEndde())
                .reqstDe(entity.getReqstDe())
                .vcatnResn(entity.getVcatnResn())
                .occrrncYear(entity.getOccrrncYear())
                .noonSe(entity.getNoonSe())
                .sanctnerId(entity.getSanctnerId())
                .confmAt(entity.getConfmAt())
                .sanctnDt(entity.getSanctnDt())
                .returnResn(entity.getReturnResn())
                .infrmlSanctnId(entity.getInfrmlSanctnId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
