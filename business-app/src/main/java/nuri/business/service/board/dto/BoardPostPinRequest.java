package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import nuri.foundation.core.validation.Ymd;

/**
 * 운영 화면의 게시글 상단 고정·해제 요청(ADR-0040 결정 5, 설계서 §6 B2).
 *
 * <p>버전을 받지 않는다 — 고정은 게시글 버전을 올리지 않는 운영자 행위라 작성자 수정과 다투지 않는다(결정 10). 고정할 때 종료일을
 * 비우면 서버가 오늘부터 게시판의 고정 기본 일수 뒤까지로 정한다. 해제에는 종료일을 보내지 않는다.
 */
@Schema(description = "게시글 상단 고정·해제 요청(운영 화면)")
public record BoardPostPinRequest(
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
