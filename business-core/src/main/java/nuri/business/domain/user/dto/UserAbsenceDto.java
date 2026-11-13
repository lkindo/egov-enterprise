package nuri.business.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import nuri.foundation.core.validation.Ymd;

import lombok.Builder;

@Builder
public record UserAbsenceDto(
    @Size(max = 20)
    @NotBlank
    String userId,

    // [2026-09-22 GAP-CONTRACT-001] 물리 컬럼 1 을 입력에서 보호한다.
    @Size(max = 1)
    String userAbsnYn,

    // [V2_151] 부재 기간에 대신 결재하는 사용자(esntlId). 부재(Y)일 때만, 기간과 함께 둔다.
    @Schema(description = "대리결재자 esntlId(사용자 검색이 돌려주는 식별자). 부재(Y)일 때만 두며 부재 기간이 함께 있어야 합니다. "
            + "본인·사용 중이 아니거나 잠긴 계정·그 기간에 부재 중이거나 이미 다른 사람의 대리결재자인 사용자는 지정할 수 없습니다.",
            maxLength = 20)
    @Size(max = 20)
    String sbtAprvrId,

    @Schema(description = "부재시작일자(yyyyMMdd, 한국 날짜)")
    @Pattern(regexp = Ymd.OPTIONAL_PATTERN)
    String absnBgngYmd,

    @Schema(description = "부재종료일자(yyyyMMdd, 한국 날짜, 이 날까지 포함)")
    @Pattern(regexp = Ymd.OPTIONAL_PATTERN)
    String absnEndYmd
) {
}
