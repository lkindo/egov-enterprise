package com.company.project.service.recentsearchword.dto;

import com.company.project.domain.recentsearchword.RecentSearchword;
import com.company.project.domain.recentsearchword.RecentSearchwordManage;
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
@Schema(description = "최근 검색어 DTO")
public class RecentSearchwordDto {

    @Schema(description = "검색어 관리 ID")
    private String searchwordManageId;

    @Schema(description = "검색어 관리 명")
    private String searchwordManageNm;

    @Schema(description = "검색어 연결 URL")
    private String searchwordConectUrl;

    @Schema(description = "사용자 검색 여부")
    private String userSearchAt;

    @Schema(description = "검색어 ID")
    private String searchwordId;

    @Schema(description = "검색어 명")
    private String searchwordNm;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록 일시")
    private LocalDateTime createdDate;

    public static RecentSearchwordDto from(RecentSearchwordManage entity) {
        if (entity == null)
            return null;
        return RecentSearchwordDto.builder()
                .searchwordManageId(entity.getSearchwordManageId())
                .searchwordManageNm(entity.getSearchwordManageNm())
                .searchwordConectUrl(entity.getSearchwordConectUrl())
                .userSearchAt(entity.getUserSearchAt())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }

    public static RecentSearchwordDto from(RecentSearchword entity) {
        if (entity == null)
            return null;
        return RecentSearchwordDto.builder()
                .searchwordId(entity.getSearchwordId())
                .searchwordManageId(entity.getSearchwordManageId())
                .searchwordNm(entity.getSearchwordNm())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}