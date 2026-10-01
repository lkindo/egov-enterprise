package nuri.business.service.survey.dto;

import nuri.foundation.core.validation.Ymd;
import nuri.foundation.core.validation.YmdRange;

import jakarta.validation.constraints.*;

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
@Schema(description = "설문정보 DTO (표준화)")
@YmdRange(start = "srvyBgngYmd", end = "srvyEndYmd")
public class SurveyInfoDto {

    @Schema(description = "설문 일련번호")
    private Long srvySn;

    @Schema(description = "설문 제목")
    @Size(max = 256)
    @NotBlank
    private String srvyTtl;

    @Schema(description = "설문 목적")
    @Size(max = 4000)
    private String srvyPrps;

    @Schema(description = "설문 작성 안내 내용")
    @Size(max = 4000)
    private String srvyWrtGdCn;

    @Schema(description = "설문 시작 일자")
    @Size(max = 8)
    @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
    private String srvyBgngYmd;

    @Schema(description = "설문 종료 일자")
    @Size(max = 8)
    @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
    private String srvyEndYmd;

    @Schema(description = "설문 대상")
    @Size(max = 1000)
    private String srvyTrgt;

    @Schema(description = "설문 템플릿 일련번호")
    @NotNull
    private Long srvyTmpltSn;

    @Schema(description = "등록자 ID")
    private String frstRgtrId;

    @Schema(description = "등록 일시")
    private LocalDateTime crtDt;

    // [2026-09-26 DIP V8] 현재 사용자가 이미 응답했는지. 상세 조회에서만 채우고(목록은 null) 요청으로는 받지 않는다.
    @Schema(description = "현재 사용자의 응답 여부(상세 조회에서만 채운다)", accessMode = Schema.AccessMode.READ_ONLY, nullable = true)
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private Boolean responded;

    /**
     * [2026-10-01 결정 21] 공개 여부 — 'Y' 공개, 'N' 작성 중. 등록은 늘 작성 중으로 시작하고(요청 값 무시), 수정은 값이
     * 있을 때만 바꾸며 비우면 그대로 둔다.
     */
    @Schema(description = "공개 여부(Y 공개 · N 작성 중)", nullable = true, types = {"string", "null"})
    @jakarta.validation.constraints.Pattern(regexp = "^(?:Y|N)$")
    private String rlsYn;
}
