package com.company.project.service.template.dto;

import com.company.project.domain.template.Template;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * ??뵆??DTO
 */
@Getter
@Builder
public class TemplateDto {
    private String tmplatId;
    private String tmplatNm;
    private String tmplatCours;
    private String tmplatSeCode;
    private String useAt;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static TemplateDto from(Template entity) {
        return TemplateDto.builder()
                .tmplatId(entity.getTmplatId())
                .tmplatNm(entity.getTmplatNm())
                .tmplatCours(entity.getTmplatCours())
                .tmplatSeCode(entity.getTmplatSeCode())
                .useAt(entity.getUseAt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
