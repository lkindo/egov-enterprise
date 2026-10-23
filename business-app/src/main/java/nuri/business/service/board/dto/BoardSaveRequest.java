package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import nuri.foundation.core.validation.Ymd;
import nuri.foundation.core.validation.YmdRange;
import org.jspecify.annotations.NonNull;

/**
 * 게시글 저장 요청(등록·답글·수정).
 *
 * <p>[2026-10-23 ADR-0040 결정 12] 게시 기간은 8자리(yyyyMMdd)만 받고 달력·순서를 서버가 검사한다 — 날짜를 사전순으로 비교해
 * 기간을 집행하므로 형식이 어긋나면 판정이 조용히 틀린다. 수정에서 날짜를 보내지 않거나 비우면 저장값을 그대로 둔다(종료일
 * 해제는 운영 화면의 일괄 처리가 맡는다). [결정 10] 수정은 상세에서 받은 {@code version} 을 돌려보낸다.
 */
@Schema(description = "게시글 저장 요청")
@YmdRange(start = "pstBgngYmd", end = "pstEndYmd")
public record BoardSaveRequest(
                @Schema(description = "게시판 ID") @NotBlank(message = "Board ID is required.") @Size(max = 20) @NonNull String bbsId,

                @Schema(description = "게시글 제목") @NotBlank(message = "Subject is required.") @Size(min = 1, max = 256, message = "Subject must be between 1 and 256 characters.") @NonNull String pstTtl,

                @Schema(description = "게시글 내용") @NotBlank(message = "Content is required.") @Size(max = 4000) @NonNull String pstCn,

                @Schema(description = "게시 시작일자(yyyyMMdd). 오늘보다 뒤면 그날까지 작성자와 조회 대행 권한자에게만 보인다(예약 게시를 받는 게시판만). "
                                + "게시가 시작된 글의 시작일은 게시글 전체 수정 권한이 있어야 바꾼다. 수정에서 비우면 저장값을 유지한다")
                @Size(max = 8)
                @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.") String pstBgngYmd,

                @Schema(description = "게시 종료일자(yyyyMMdd). 시작일보다 빠를 수 없다. 수정에서 비우면 저장값을 유지한다")
                @Size(max = 8)
                @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.") String pstEndYmd,

                @Schema(description = "첨부파일 일련번호") Long atchFileSn,

                @Schema(description = "행사 일자") @Size(max = 20) String evntDt,

                @Schema(description = "Q&A 상태 코드 (OPEN/SOLVED)") @Size(max = 12) String qnaSttsCd,

                @Schema(description = "Q&A 카테고리") @Size(max = 12) String qnaCatCd,

                @Schema(description = "비밀글 여부 (Y/N)") @Pattern(regexp = "^[YN]$") String scrtYn,

                @Schema(description = "사용 여부 (Y/N)") @Pattern(regexp = "^[YN]$") String useYn,

                @Schema(description = "폐기됨 — 게시글 비밀번호를 확인하는 경로가 없어 서버가 저장하지 않는다(보내도 무시한다).", deprecated = true)
                @Size(max = 200) String pswd,

                @Schema(description = "게시글 버전 — 수정 요청에서만 쓴다. 상세 조회의 version 을 그대로 돌려보낸다(없으면 400, 다르면 409). "
                                + "등록·답글에서는 쓰지 않는다")
                @Min(0) Integer version) {
}
