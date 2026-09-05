package nuri.business.service.operation.dto;

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
    // [2026-09-05] 물리 컬럼 폭과 정합(rwrd_user_id 20·rwrd_cd 12·rwrd_ymd 8·rwrd_nm 100·cntrb_cn 4000·atrzr_id 20·confm_yn 1·rtn_rsn_cn 4000).
    //   DTO 필드명이 레거시(rwardwnrId 등)라 InputContractMirrorLinter 의 이름 기반 바인딩은 붙이지 못한다.
    @Size(max = 20)
    private String rwardwnrId;
    @Size(max = 12)
    private String rwardCode;
    @Size(max = 8)
    private String rwardDe;
    @Size(max = 100)
    private String rwardNm;
    @Size(max = 4000)
    private String pblenCn;
    @Size(max = 20)
    private String sanctnerId;
    @Size(max = 1)
    private String confmAt;
    private LocalDateTime sanctnDt;
    @Size(max = 4000)
    private String returnResn;
    private Long atchFileSn;
    private Long ifmlAtrzSn;
    private String frstRgtrId;
    private LocalDateTime crtDt;
    private String lastMdfrId;
    private LocalDateTime mdfcnDt;
}
