package com.company.project.service.ans.dto;

import com.company.project.domain.anniversary.Anniversary;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnniversaryDto {
    private String annId;
    private String usid;
    private String annvrsrySe;
    private String annvrsryNm;
    private String annvrsryDe;
    private String cldrSe;
    private String reptitSe;
    private String annvrsrySetup;
    private String annvrsryBeginDe;
    private String memo;
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;

    public static AnniversaryDto from(Anniversary entity) {
        if (entity == null) return null;
        return AnniversaryDto.builder()
                .annId(entity.getAnnId())
                .usid(entity.getUsid())
                .annvrsrySe(entity.getAnnvrsrySe())
                .annvrsryNm(entity.getAnnvrsryNm())
                .annvrsryDe(entity.getAnnvrsryDe())
                .cldrSe(entity.getCldrSe())
                .reptitSe(entity.getReptitSe())
                .annvrsrySetup(entity.getAnnvrsrySetup())
                .annvrsryBeginDe(entity.getAnnvrsryBeginDe())
                .memo(entity.getMemo())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
