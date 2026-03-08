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
@Schema(description = "Description")
public class WikiBookmarkDto {

    @Schema(description = "Description")
    private String wikiBkmkId;

    @Schema(description = "Description")
    private String userId;

    @Schema(description = "Description")
    private String wikiBkmkNm;

    @Schema(description = "Description")
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
