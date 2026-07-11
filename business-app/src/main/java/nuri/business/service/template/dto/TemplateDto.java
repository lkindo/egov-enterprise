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
    private String frstRgtrId;
    private LocalDateTime crtDt;

    // 엔티티→DTO 매핑은 TemplateMapper (MapStruct, 프레임워크 표준) 로 이관됨.

    public Template toEntity() {
        return Template.builder()
                .tmpltId(this.tmpltId)
                .tmpltNm(this.tmpltNm)
                .tmpltPath(this.tmpltPath)
                .tmpltSeCd(this.tmpltSeCd)
                .useYn(this.useYn)
                .build();
    }
}
