package nuri.business.service.survey.dto;

import jakarta.validation.constraints.*;

import nuri.business.domain.survey.OnlinePollManage;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "온라인 설문 관리 DTO (표준화)")
public class OnlinePollManageDto {

    @Schema(description = "설문 일련번호")
    // 서버 생성 PK — create 시 미전송(서버가 생성), update는 PathVariable 사용. @NotBlank는 create를 400으로 막으므로 제거.
    private Long pollSn;

    @Schema(description = "설문 제목")
    @Size(max = 100)
    @NotBlank
    private String pollNm;

    @Schema(description = "설문 시작일")
    @Size(max = 8)
    private String pollBgngYmd;

    @Schema(description = "설문 종료일")
    @Size(max = 8)
    private String pollEndYmd;

    @Schema(description = "설문 종류 코드")
    @Size(max = 12)
    private String pollKndCd;

    @Schema(description = "설문 폐기 여부")
    private String pollDsuseYn;

    @Schema(description = "설문 자동 폐기 여부")
    private String pollAtmcDsuseYn;

    @Schema(description = "생성자 ID")
    private String frstRgtrId;

    @Schema(description = "생성 일시")
    private LocalDateTime crtDt;

    @Schema(description = "설문 항목 목록")
    @jakarta.validation.Valid  // 중첩 원소(@NotBlank pollArtclNm)를 컨트롤러 @Valid 로 캐스케이드 검증 → null 항목명 NPE(500) 대신 400
    private List<OnlinePollArticleDto> pollArticles;

    public static OnlinePollManageDto from(OnlinePollManage entity) {
        if (entity == null) return null;
        return OnlinePollManageDto.builder()
                .pollSn(entity.getPollSn())
                .pollNm(entity.getPollNm())
                .pollBgngYmd(entity.getPollBgngYmd())
                .pollEndYmd(entity.getPollEndYmd())
                .pollKndCd(entity.getPollKndCd())
                .pollDsuseYn(entity.getPollDsuseYn())
                .pollAtmcDsuseYn(entity.getPollAtmcDsuseYn())
                .frstRgtrId(entity.getFrstRgtrId())
                .crtDt(entity.getCrtDt())
                // 항목(pollArticles)은 서비스 레이어에서 OnlinePollArticleMapper 로 채운다.
                // (수기 OnlinePollArticleDto.from() 제거 — entity→DTO 매핑을 Mapper 로 단일화해 드리프트 방지)
                .pollArticles(Collections.emptyList())
                .build();
    }
}
