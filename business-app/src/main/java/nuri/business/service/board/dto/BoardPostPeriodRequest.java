package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import nuri.foundation.core.validation.Ymd;
import nuri.foundation.core.validation.YmdRange;

/**
 * 운영 화면 빠른 편집의 게시 기간 변경 요청(ADR-0040 결정 3·10·12, 설계서 §6 B1). 제목·본문을 다시 보내지 않고 게시 기간과
 * 버전만 받는다 — 버전·이력·권한을 한 경로에 묶는다.
 *
 * <p>보내지 않거나 비운 날짜는 지금 값을 유지한다. 종료일 해제는 받지 않는다 — 해제는 일괄 처리의 명시적 동작(CLEAR_END)이다
 * (결정 12). 오늘보다 이른 종료일로 바로 내리기도 받지 않는다(설계서 §5.4).
 */
@Schema(description = "게시글 게시 기간 변경 요청(운영 화면) — 보내지 않거나 비운 날짜는 지금 값을 유지한다")
@YmdRange(start = "pstBgngYmd", end = "pstEndYmd")
public record BoardPostPeriodRequest(
        @Schema(description = "게시 시작일자(yyyyMMdd). 오늘보다 뒤면 예약 게시를 받는 게시판에서만 받는다")
        @Size(max = 8)
        @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
        String pstBgngYmd,

        @Schema(description = "게시 종료일자(yyyyMMdd). 오늘이나 그 뒤여야 한다")
        @Size(max = 8)
        @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
        String pstEndYmd,

        @Schema(description = "목록에서 읽은 게시글 버전. 다르면 다른 사람이 먼저 고친 것이라 409 다")
        @NotNull
        @Min(0)
        Integer version) {
}
