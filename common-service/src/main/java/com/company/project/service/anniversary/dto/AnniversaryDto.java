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
@Schema(description = "기념일 정보 DTO")
public class AnniversaryDto {

    @Schema(description = "기념일 ID")
    private String annId;

    @Schema(description = "사용자 ID")
    private String usid;

    @Schema(description = "기념일 구분")
    private String annvrsrySe;

    @Schema(description = "기념일 명")
    private String annvrsryNm;

    @Schema(description = "기념일")
    private String annvrsryDe;

    @Schema(description = "양/음력 구분")
    private String cldrSe;

    @Schema(description = "알림 설정 여부")
    private String annvrsrySetup;

    @Schema(description = "알림 시작 일자")
    private String annvrsryBeginDe;

    @Schema(description = "메모")
    private String memo;

    @Schema(description = "반복 여부")
    private String reptitAt;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
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
