package com.company.project.service.system.dto;

import com.company.project.domain.system.Anniversary;
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
    private String createdBy;
    private LocalDateTime createdDate;

    // Manual getters to bypass Lombok issues
    public String getAnnId() {
        return annId;
    }

    public String getUsid() {
        return usid;
    }

    public String getAnnvrsrySe() {
        return annvrsrySe;
    }

    public String getAnnvrsryNm() {
        return annvrsryNm;
    }

    public String getAnnvrsryDe() {
        return annvrsryDe;
    }

    public String getCldrSe() {
        return cldrSe;
    }

    public String getReptitSe() {
        return reptitSe;
    }

    public String getAnnvrsrySetup() {
        return annvrsrySetup;
    }

    public String getAnnvrsryBeginDe() {
        return annvrsryBeginDe;
    }

    public String getMemo() {
        return memo;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public static AnniversaryDto from(Anniversary entity) {
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
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
