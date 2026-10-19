package nuri.business.service.reward.dto;

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
public class RewardManageDto {
    private Long rwrdSn;
    // 물리 컬럼 폭과 정합(rwrd_user_id 20·rwrd_cd 12·rwrd_ymd 8·rwrd_nm 300·cntrb_cn 4000).
    //   DTO 필드명이 레거시(rwardwnrId 등)라 InputContractMirrorLinter 의 이름 기반 바인딩은 붙이지 못한다.
    // [2026-10-18] 수상자·포상 코드는 물리 컬럼이 NOT NULL 이다(rwrd_user_id·rwrd_cd). 종전에는 길이만 검사해 빈 값이
    //   그대로 들어가거나(빈 문자열) DB NOT NULL 로 거부됐다. 화면은 처음부터 필수로 받았다.
    @Size(max = 20)
    @NotBlank
    private String rwardwnrId;
    @Size(max = 12)
    @NotBlank
    private String rwardCode;
    // [2026-10-18] 포상 일자는 길이만 보던 것을 다른 날짜 입력과 같은 yyyyMMdd 달력 계약으로 맞춘다(없는 날짜 거부).
    @Size(max = 8)
    @Pattern(regexp = nuri.foundation.core.validation.Ymd.OPTIONAL_PATTERN, message = "날짜는 유효한 yyyyMMdd 형식이어야 합니다.")
    private String rwardDe;
    @Size(max = 300)
    private String rwardNm;
    @Size(max = 4000)
    private String pblenCn;
    // [2026-10-19] 승인 필드(승인자·승인 여부·승인 일시·반려 사유·연결 결재)를 걷었다 — 승인 절차가 제품에 없어 늘
    //   대기·빈값이었다. 물리 컬럼은 남지만 앱은 쓰지도 내보내지도 않는다. 감사 필드는 응답 전용이다 — 서버가 소유한다.
    private Long atchFileSn;
    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String frstRgtrId;
    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime crtDt;
    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String lastMdfrId;
    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime mdfcnDt;

    @Schema(description = "낙관적 잠금 버전(V2_133). 조회한 값을 수정 요청에 그대로 돌려보내며 수정할 때 필수다 — 다르면 409. 등록에서는 무시한다.")
    @Min(0)
    private Integer version;
}
