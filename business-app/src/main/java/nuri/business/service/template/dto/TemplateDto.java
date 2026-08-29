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

    /**
     * 템플릿 ID — <b>클라이언트가 정하는 업무 키</b>다.
     *
     * <p>{@code tb_tmplt_info.tmplt_id} 는 PK 이자 NOT NULL 인데 엔티티에 생성 전략이 없고
     * 서비스도 값을 만들지 않는다({@code save(dto.toEntity())} 뿐). 그런데 종전에는 이 필드에
     * 제약이 없어 값을 빼먹은 요청이 검증을 통과해 DB 제약 위반(500)까지 갔다 — 사용자에게는
     * "등록에 실패했습니다" 만 보였다. 서버가 요구하는 것을 요청 단계에서 요구한다.
     */
    @NotBlank
    @Size(max = 20)
    private String tmpltId;

    @NotBlank
    @Size(max = 100)
    private String tmpltNm;

    @NotBlank
    @Size(max = 1000)
    private String tmpltPath;

    @NotBlank
    @Size(max = 12)
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
