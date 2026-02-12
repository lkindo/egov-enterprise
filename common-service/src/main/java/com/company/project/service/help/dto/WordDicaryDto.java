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
@Schema(description = "용어사전 정보 DTO")
public class WordDicaryDto {

    @Schema(description = "용어 ID")
    private String wordId;

    @Schema(description = "용어 명")
    private String wordNm;

    @Schema(description = "영문 명")
    private String engNm;

    @Schema(description = "용어 설명")
    private String wordDc;

    @Schema(description = "동의어")
    private String synonm;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
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
