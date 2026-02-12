package com.company.project.service.vct.dto;

import com.company.project.domain.notification.VcatnManage;
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
    private String vcatnResn;
    private String reqstDe;
    private String occrrncYear;
    private String noonSe;
    private String sanctnerId;
    private String confmAt;
    private LocalDateTime sanctnDt;
    private String returnResn;
    private String infrmlSanctnId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static VacationDto from(VcatnManage entity) {
        if (entity == null) return null;
        return VacationDto.builder()
                .applcntId(entity.getApplcntId())
                .vcatnSe(entity.getVcatnSe())
                .bgnde(entity.getBgnde())
                .endde(entity.getEndde())
                .vcatnResn(entity.getVcatnResn())
                .reqstDe(entity.getReqstDe())
                .occrrncYear(entity.getOccrrncYear())
                .noonSe(entity.getNoonSe())
                .sanctnerId(entity.getSanctnerId())
                .confmAt(entity.getConfmAt())
                .sanctnDt(entity.getSanctnDt())
                .returnResn(entity.getReturnResn())
                .infrmlSanctnId(entity.getInfrmlSanctnId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
