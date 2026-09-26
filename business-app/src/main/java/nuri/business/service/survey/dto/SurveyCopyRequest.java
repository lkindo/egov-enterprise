package nuri.business.service.survey.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import nuri.foundation.core.validation.Ymd;
import nuri.foundation.core.validation.YmdRange;

/**
 * 설문 복제 요청 — 사본의 제목과 기간(2026-09-26 DIP B5 F6).
 *
 * <p>기간은 원본에서 복사하지 않고 반드시 받는다. 원본이 진행 중이면 같은 기간의 사본이 곧바로 응답을 받아 같은 설문이
 * 둘 열리고, 기간을 비우면 빈 경계가 '열림'이라(DEC-OPS-031) 사본이 무기한 열린다. 어느 쪽도 복제하는 사람이
 * 의도한 것이 아니므로 새 기간을 정하게 한다.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@YmdRange(start = "srvyBgngYmd", end = "srvyEndYmd")
@Schema(description = "설문 복제 요청 — 사본의 제목과 기간")
public class SurveyCopyRequest {

    @Schema(description = "사본 제목", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @Size(max = 256)
    private String srvyTtl;

    @Schema(description = "사본 설문 시작 일자(yyyyMMdd)", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @Size(max = 8)
    @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
    private String srvyBgngYmd;

    @Schema(description = "사본 설문 종료 일자(yyyyMMdd)", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @Size(max = 8)
    @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
    private String srvyEndYmd;
}
