package nuri.business.service.code.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

/**
 * 공통코드 변경 이력 한 건(2026-09-27 DIP B5 F11). 응답 전용이다.
 *
 * <p>변경자는 이름으로 싣는다 — 이름을 찾지 못하면 null 이다. 연락처 등 개인정보는 싣지 않는다.</p>
 */
@Schema(description = "공통코드 변경 이력")
public record CommonCodeChangeDto(
        @Schema(description = "이력 일련번호") Long comCdChgHstrySn,
        @Schema(description = "변경 대상(CLSF 분류·CODE 그룹·DTL 상세)", allowableValues = { "CLSF", "CODE", "DTL" }) String chgTrgtTypeCd,
        @Schema(description = "변경 유형(ADD 등록·UPDATE 수정·REMOVE 삭제)", allowableValues = { "ADD", "UPDATE", "REMOVE" }) String chgTypeCd,
        @Schema(description = "분류 코드", nullable = true) String clsfCd,
        @Schema(description = "그룹 ID", nullable = true) String cdId,
        @Schema(description = "상세 코드", nullable = true) String dtlCd,
        @Schema(description = "바뀐 항목") String chgArtclNm,
        @Schema(description = "변경 전 값", nullable = true) String chgBfrCn,
        @Schema(description = "변경 후 값", nullable = true) String chgAftrCn,
        @Schema(description = "변경자 이름", nullable = true) String chgUserNm,
        @Schema(description = "변경 일시") LocalDateTime crtDt) {
}
