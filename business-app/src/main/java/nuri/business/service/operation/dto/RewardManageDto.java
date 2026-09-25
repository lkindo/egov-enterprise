package nuri.business.service.operation.dto;

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
    // 물리 컬럼 폭과 정합(rwrd_user_id 20·rwrd_cd 12·rwrd_ymd 8·rwrd_nm 300·cntrb_cn 4000·atrzr_id 20·confm_yn 1·rtn_rsn_cn 4000).
    //   DTO 필드명이 레거시(rwardwnrId 등)라 InputContractMirrorLinter 의 이름 기반 바인딩은 붙이지 못한다.
    @Size(max = 20)
    private String rwardwnrId;
    @Size(max = 12)
    private String rwardCode;
    @Size(max = 8)
    private String rwardDe;
    @Size(max = 300)
    private String rwardNm;
    @Size(max = 4000)
    private String pblenCn;
    // 승인·감사 필드는 응답 전용이다 — 서버가 소유한다(2026-09-25 DIP I6 ③). 요청에 실어도 저장되지 않는다.
    @Size(max = 20)
    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String sanctnerId;
    @Size(max = 1)
    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String confmAt;
    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime sanctnDt;
    @Size(max = 4000)
    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String returnResn;
    private Long atchFileSn;
    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long ifmlAtrzSn;
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
}
