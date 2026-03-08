package com.company.project.service.help.dto;

import com.company.project.domain.help.WordDicary;
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
public class WordDicaryDto {

    @Schema(description = "Description")
    private String wordId;

    @Schema(description = "Description")
    private String wordNm;

    @Schema(description = "Description")
    private String engNm;

    @Schema(description = "Description")
    private String wordDc;

    @Schema(description = "Description")
    private String synonm;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public static WordDicaryDto from(WordDicary entity) {
        if (entity == null) return null;
        return WordDicaryDto.builder()
                .wordId(entity.getWordId())
                .wordNm(entity.getWordNm())
                .engNm(entity.getEngNm())
                .wordDc(entity.getWordDc())
                .synonm(entity.getSynonm())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
