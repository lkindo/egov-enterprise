package nuri.business.service.template.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.template.Template;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

/**
 * ??뵆??DTO
 */
@Getter
@Builder
public class TemplateDto {
    private String tmpltId;
    private String tmpltNm;
    private String tmpltPath;
    private String tmpltSeCd;
    @Size(max = 1)
    @NotBlank
    private String useYn;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static TemplateDto from(Template entity) {
        if (entity == null) return null;
        return TemplateDto.builder()
                .tmpltId(entity.getTmpltId())
                .tmpltNm(entity.getTmpltNm())
                .tmpltPath(entity.getTmpltPath())
                .tmpltSeCd(entity.getTmpltSeCd())
                .useYn(entity.getUseYn())
                .frstRegisterId(entity.getFrstRgtrId())
                .frstRegisterPnttm(entity.getCreatedDate())
                .build();
    }
}
