package nuri.business.service.board.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.board.Blog;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "블로그 정보 DTO")
public class BlogDto {
    @Schema(description = "블로그 ID")
    @Size(max = 20)
    private String blogId;

    @Schema(description = "게시판 ID")
    @Size(max = 20)
    private String bbsId;

    @Schema(description = "블로그 제목")
    @Size(max = 300)
    @NotBlank
    private String blogTtl;

    @Schema(description = "블로그 소개 내용")
    @Size(max = 4000)
    private String blogIntroCn;

    @Schema(description = "등록 구분 코드")
    @Size(max = 12)
    private String regSeCd;

    @Schema(description = "템플릿 ID")
    @Size(max = 20)
    private String tmpltId;

    @Schema(description = "사용 여부")
    @Size(max = 1)
    @NotBlank
    private String useYn;

    @Schema(description = "최초 등록자 ID")
    private String frstRegisterId;

    @Schema(description = "최초 등록 일시")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "최종 수정자 ID")
    private String lastUpdusrId;

    @Schema(description = "최종 수정 일시")
    private LocalDateTime lastUpdtPnttm;

    @Schema(description = "블로그 여부")
    @Size(max = 1)
    private String blogYn;

    public static BlogDto from(Blog entity) {
        if (entity == null)
            return null;
        return BlogDto.builder()
                .blogId(entity.getBlogId())
                .bbsId(entity.getBbsId())
                .blogTtl(entity.getBlogTtl())
                .blogIntroCn(entity.getBlogIntroCn())
                .regSeCd(entity.getRegSeCd())
                .tmpltId(entity.getTmpltId())
                .useYn(entity.getUseYn())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdtPnttm(entity.getLastModifiedDate())
                .blogYn(entity.getBlogYn())
                .build();
    }
}

