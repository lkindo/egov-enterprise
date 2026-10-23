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
 * 운영 화면의 게시글 상단 고정·해제 일괄 처리 요청(ADR-0040 결정 5·10, 설계서 §6 B2).
 *
 * <p>게시 종료일 일괄 처리({@link BoardPostPeriodBatchRequest})와 경로·권한을 나눈다 — 고정은 BOARD_PIN, 게시 기간은
 * BOARD_UPDATE_ALL 이다. 하나라도 맞지 않으면(경로의 게시판에 없는 글, 답글, 상한 초과) 아무것도 바꾸지 않는다. 고정하면 고른 글
 * 모두 같은 종료일이 된다 — 이미 고정 중인 글의 종료일도 바뀌고, 그 글은 상한 집계에서 새 고정으로 세지 않는다.
 */
@Schema(description = "게시글 상단 고정·해제 일괄 처리 요청(운영 화면) — 하나라도 맞지 않으면 전체를 적용하지 않는다")
public record BoardPostPinBatchRequest(
        @ArraySchema(
                arraySchema = @Schema(description = "대상 게시글 번호 목록(경로의 게시판에 속한 원글)"),
                schema = @Schema(implementation = Long.class),
                minItems = 1,
                maxItems = 100)
        @NotEmpty(message = "{validation.required}")
        @Size(min = 1, max = 100, message = "게시글은 한 번에 1개 이상 100개까지 처리할 수 있습니다.")
        List<@NotNull Long> pstSns,

        @Schema(description = "Y 고정, N 해제", allowableValues = { "Y", "N" })
        @NotBlank(message = "{validation.required}")
        @Size(max = 1)
        @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
        String upendFixYn,

        @Schema(description = "고정 종료일자(yyyyMMdd, 고정할 때만). 오늘이나 그 뒤여야 하고, 비우면 오늘부터 게시판의 고정 기본 일수 뒤까지다")
        @Size(max = 8)
        @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
        String upendFixEndYmd) {
}
