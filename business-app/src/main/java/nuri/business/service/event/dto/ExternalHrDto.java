package nuri.business.service.event.dto;

import nuri.foundation.core.validation.Ymd;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExternalHrDto {

    @NotNull
    @Positive
    private Long evntSn;
    @NotBlank
    @Size(max = 20)
    private String otsdHrId;
    // [2026-09-05] 물리 컬럼 length=12 와 정합(InputContractMirrorLinter 표적 편입).
    @Size(max = 12)
    private String gndrCd;
    @Size(max = 100)
    private String otsdHrNm;
    @Size(max = 12)
    private String crTypeCd;
    @Size(max = 200)
    private String ogdpInstNm;
    @Size(max = 8)
    @Pattern(regexp = Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
    private String brdtYmd;
    @Size(max = 4)
    private String areaNo;
    @Size(max = 4)
    private String mdTelno;
    @Size(max = 4)
    private String endTelno;
    // [2026-09-05] 물리 컬럼 length=320 와 정합. 종전 50 은 컬럼보다 좁은 임의 제한이었다.
    @Size(max = 320)
    private String emlAddr;

    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime crtDt;
    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String frstRgtrId;
    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime mdfcnDt;
    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String lastMdfrId;

    @Schema(description = "낙관적 잠금 버전(V2_149). 조회한 값을 수정 요청에 그대로 돌려보내며 수정할 때 필수다 — 다르면 409. 등록에서는 무시한다.")
    @Min(0)
    private Integer version;
}
