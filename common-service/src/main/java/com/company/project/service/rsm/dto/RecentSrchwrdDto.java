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
@Schema(description = "최근 검색어 정보 DTO")
public class RecentSrchwrdDto {

    @Schema(description = "검색어 관리 ID")
    private String srchwrdManageId;

    @Schema(description = "검색어 관리 명")
    private String srchwrdManageNm;

    @Schema(description = "검색어 연결 URL")
    private String srchwrdConectUrl;

    @Schema(description = "사용자 검색 여부")
    private String userSearchAt;

    @Schema(description = "검색어 ID")
    private String srchwrdId;

    @Schema(description = "검색어 명")
    private String srchwrdNm;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
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
