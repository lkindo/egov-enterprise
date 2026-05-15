package nuri.foundation.service.template.dto;

import nuri.foundation.domain.template.Template;
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
    private String useYn;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static TemplateDto from(Template entity) {
        return TemplateDto.builder()
                .tmplatId(entity.getTmplatId())
                .tmplatNm(entity.getTmplatNm())
                .tmplatCours(entity.getTmplatCours())
                .tmplatSeCode(entity.getTmplatSeCode())
                .useYn(entity.getUseYn())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
