package com.company.project.service.rsm.dto;

import com.company.project.domain.rsm.RecentSrchwrd;
import com.company.project.domain.rsm.RecentSrchwrdManage;
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
public class RecentSrchwrdDto {

    @Schema(description = "Description")
    private String srchwrdManageId;

    @Schema(description = "Description")
    private String srchwrdManageNm;

    @Schema(description = "Description")
    private String srchwrdConectUrl;

    @Schema(description = "Description")
    private String userSearchAt;

    @Schema(description = "Description")
    private String srchwrdId;

    @Schema(description = "Description")
    private String srchwrdNm;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public static RecentSrchwrdDto from(RecentSrchwrdManage entity) {
        if (entity == null) return null;
        return RecentSrchwrdDto.builder()
                .srchwrdManageId(entity.getSrchwrdManageId())
                .srchwrdManageNm(entity.getSrchwrdManageNm())
                .srchwrdConectUrl(entity.getSrchwrdConectUrl())
                .userSearchAt(entity.getUserSearchAt())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }

    public static RecentSrchwrdDto from(RecentSrchwrd entity) {
        if (entity == null) return null;
        return RecentSrchwrdDto.builder()
                .srchwrdId(entity.getSrchwrdId())
                .srchwrdManageId(entity.getSrchwrdManageId())
                .srchwrdNm(entity.getSrchwrdNm())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
