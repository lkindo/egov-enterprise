package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

/**
 * 게시판 변경 이력 한 건(ADR-0040 결정 9). 응답 전용이다.
 *
 * <p>변경자는 이름으로 싣는다 — 이름을 찾지 못하면 null 이다. 연락처 등 개인정보는 싣지 않는다(공통코드 변경 이력과 같다).</p>
 */
@Schema(description = "게시판 변경 이력")
public record BoardChangeDto(
        @Schema(description = "이력 일련번호", requiredMode = Schema.RequiredMode.REQUIRED) Long bbsChgHstrySn,
        @Schema(description = "변경 대상(BBS 게시판·PST 게시글)", allowableValues = { "BBS", "PST" },
                requiredMode = Schema.RequiredMode.REQUIRED) String chgTrgtTypeCd,
        @Schema(description = "변경 유형(SETTING 설정·USE 사용 여부·PERIOD 게시 기간·PIN 고정·UNPIN 고정 해제)",
                allowableValues = { "SETTING", "USE", "PERIOD", "PIN", "UNPIN" },
                requiredMode = Schema.RequiredMode.REQUIRED) String chgTypeCd,
        @Schema(description = "게시글 번호(게시글 행만)", nullable = true) Long pstSn,
        @Schema(description = "바뀐 항목", requiredMode = Schema.RequiredMode.REQUIRED) String chgArtclNm,
        @Schema(description = "변경 전 값", nullable = true) String chgBfrCn,
        @Schema(description = "변경 후 값", nullable = true) String chgAftrCn,
        @Schema(description = "변경자 이름", nullable = true) String chgUserNm,
        @Schema(description = "변경 일시", requiredMode = Schema.RequiredMode.REQUIRED) LocalDateTime crtDt) {
}
