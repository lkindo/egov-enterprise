package com.company.project.service.anniversary.dto;

import com.company.project.domain.anniversary.Anniversary;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Description")
public class AnniversaryDto {

    @Schema(description = "Description")
    private String annId;

    @Schema(description = "Description")
    private String usid;

    @Schema(description = "Description")
    private String annvrsrySe;

    @Schema(description = "Description")
    private String annvrsryNm;

    @Schema(description = "Description")
    private String annvrsryDe;

    @Schema(description = "Description")
    private String cldrSe;

    @Schema(description = "Description")
    private String annvrsrySetup;

    @Schema(description = "Description")
    private String annvrsryBeginDe;

    @Schema(description = "Description")
    private String memo;

    @Schema(description = "Description")
    private String reptitAt;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
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

    public String getAnnvrsrySetup() {
        return annvrsrySetup;
    }

    public String getAnnvrsryBeginDe() {
        return annvrsryBeginDe;
    }

    public String getMemo() {
        return memo;
    }

    public String getReptitAt() {
        return reptitAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public static AnniversaryDto from(Anniversary entity) {
        if (entity == null)
            return null;
        return AnniversaryDto.builder()
                .annId(entity.getAnnId())
                .usid(entity.getUsid())
                .annvrsrySe(entity.getAnnvrsrySe())
                .annvrsryNm(entity.getAnnvrsryNm())
                .annvrsryDe(entity.getAnnvrsryDe())
                .cldrSe(entity.getCldrSe())
                .annvrsrySetup(entity.getAnnvrsrySetup())
                .annvrsryBeginDe(entity.getAnnvrsryBeginDe())
                .memo(entity.getMemo())
                .reptitAt(entity.getReptitAt())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}