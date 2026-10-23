package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import nuri.foundation.core.validation.Ymd;

import java.util.List;

/**
 * 운영 화면의 게시 종료일 일괄 처리 요청(ADR-0040 결정 10·12, 설계서 §6 B1).
 *
 * <p>대상별 버전을 받지 않는다 — 서버가 모든 대상을 다시 판정하고 하나라도 맞지 않으면 아무것도 바꾸지 않는다(결정 10).
 * {@code END_DATE} 는 종료일이 필요하고, {@code CLEAR_END} 는 종료일을 보내지 않는다.
 */
@Schema(description = "게시글 게시 종료일 일괄 처리 요청(운영 화면) — 하나라도 맞지 않으면 전체를 적용하지 않는다")
public record BoardPostPeriodBatchRequest(
        @Schema(description = "END_DATE 종료일 바꾸기(pstEndYmd 필요), CLEAR_END 종료일 해제(pstEndYmd 없음)",
                allowableValues = { "END_DATE", "CLEAR_END" })
        @NotBlank(message = "{validation.required}")
        @Pattern(regexp = "^(?:END_DATE|CLEAR_END)$", message = "{validation.pattern}")
        String action,

        @ArraySchema(
                arraySchema = @Schema(description = "대상 게시글 번호 목록(경로의 게시판에 속한 글)"),
                schema = @Schema(implementation = Long.class),
                minItems = 1,
                maxItems = 100)
        @NotEmpty(message = "{validation.required}")
        @Size(min = 1, max = 100, message = "게시글은 한 번에 1개 이상 100개까지 처리할 수 있습니다.")
        List<@NotNull Long> pstSns,

        @Schema(description = "새 게시 종료일자(yyyyMMdd, END_DATE 만). 오늘이나 그 뒤여야 한다")
        @Size(max = 8)
        @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
        String pstEndYmd) {

    /** 종료일 바꾸기. */
    public static final String END_DATE = "END_DATE";
    /** 종료일 해제(기한 없음). */
    public static final String CLEAR_END = "CLEAR_END";
}
