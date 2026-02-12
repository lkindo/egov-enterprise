package com.company.project.service.help.dto;

import com.company.project.domain.help.AdministrationWord;
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
@Schema(description = "행정용어 정보 DTO")
public class AdministrationWordDto {

    @Schema(description = "용어 ID")
    private String administWordId;

    @Schema(description = "용어 명")
    private String administWordNm;

    @Schema(description = "영문 명")
    private String administWordEngNm;

    @Schema(description = "약어 명")
    private String administWordAbrv;

    @Schema(description = "주제 영역")
    private String themaRelm;

    @Schema(description = "용어 구분")
    private String wordDomn;

    @Schema(description = "관련 표준 용어")
    private String stdWord;

    @Schema(description = "용어 정의")
    private String administWordDf;

    @Schema(description = "용어 설명")
    private String administWordDc;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static AdministrationWordDto from(AdministrationWord entity) {
        if (entity == null) return null;
        return AdministrationWordDto.builder()
                .administWordId(entity.getAdministWordId())
                .administWordNm(entity.getAdministWordNm())
                .administWordEngNm(entity.getAdministWordEngNm())
                .administWordAbrv(entity.getAdministWordAbrv())
                .themaRelm(entity.getThemaRelm())
                .wordDomn(entity.getWordDomn())
                .stdWord(entity.getStdWord())
                .administWordDf(entity.getAdministWordDf())
                .administWordDc(entity.getAdministWordDc())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
