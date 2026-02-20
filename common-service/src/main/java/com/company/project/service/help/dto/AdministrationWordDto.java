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
@Schema(description = "Description")
public class AdministrationWordDto {

    @Schema(description = "Description")
    private String administWordId;

    @Schema(description = "Description")
    private String administWordNm;

    @Schema(description = "Description")
    private String administWordEngNm;

    @Schema(description = "Description")
    private String administWordAbrv;

    @Schema(description = "Description")
    private String themaRelm;

    @Schema(description = "Description")
    private String wordDomn;

    @Schema(description = "Description")
    private String stdWord;

    @Schema(description = "Description")
    private String administWordDf;

    @Schema(description = "Description")
    private String administWordDc;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
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
