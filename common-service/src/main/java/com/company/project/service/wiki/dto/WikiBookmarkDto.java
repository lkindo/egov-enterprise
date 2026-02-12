package com.company.project.service.wiki.dto;

import com.company.project.domain.wiki.WikiBookmark;
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
@Schema(description = "위키 북마크 정보 DTO")
public class WikiBookmarkDto {

    @Schema(description = "북마크 ID")
    private String wikiBkmkId;

    @Schema(description = "사용자 ID")
    private String userId;

    @Schema(description = "북마크 명")
    private String wikiBkmkNm;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static WikiBookmarkDto from(WikiBookmark entity) {
        if (entity == null) return null;
        return WikiBookmarkDto.builder()
                .wikiBkmkId(entity.getWikiBkmkId())
                .userId(entity.getUserId())
                .wikiBkmkNm(entity.getWikiBkmkNm())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
