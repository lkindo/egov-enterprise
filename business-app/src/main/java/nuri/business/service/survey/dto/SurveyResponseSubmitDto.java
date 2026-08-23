package nuri.business.service.survey.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 설문 응답 제출 요청.
 *
 * <p>한 번의 제출이 <b>문항 수만큼의 {@code tb_srvy_rslt} 행</b>이 된다 — 이 테이블의 1행은
 * 설문 1건이 아니라 (문항 × 항목) 응답 1건이다.
 *
 * <p>{@code @Size} 값은 물리 컬럼 실측치다(information_schema 2026-08-05):
 * {@code rspns_nm} varchar(100), {@code rspdnt_ans_cn}·{@code etc_ans_cn} varchar(4000),
 * ID 계열 varchar(20).
 */
@Schema(description = "설문 응답 제출 요청")
public record SurveyResponseSubmitDto(

        @Schema(description = "응답자명", example = "홍길동")
        @Size(max = 100)
        String rspnsNm,

        @Schema(description = "문항별 답변 목록")
        @NotEmpty(message = "답변이 최소 1건 필요합니다.")
        @Valid
        List<Answer> answers
) {

    /** 문항 1개에 대한 답변. */
    @Schema(description = "문항별 답변")
    public record Answer(

            @Schema(description = "문항 일련번호")
            @NotNull
            Long srvyQstnSn,

            /**
             * 항목 ID. 주관식 문항이라도 물리 컬럼이 {@code NOT NULL} 이므로 반드시 있어야 한다
             * — 주관식은 '기타' 성격의 단일 항목을 두고 그 ID 를 보낸다.
             */
            @Schema(description = "항목 일련번호")
            @NotNull
            Long srvyArtclSn,

            @Schema(description = "응답 내용")
            @Size(max = 4000)
            String rspdntAnsCn,

            @Schema(description = "기타 답변")
            @Size(max = 4000)
            String etcAnsCn
    ) {
    }
}
