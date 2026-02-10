package com.company.project.domain.integration;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SystemConnectionStatsDto {
    private String cntcId;
    private String cntcNm;
    private String cntcType;
    private long cntAll;
    private long cntSuccess;
    private long cntFail;
    private String provdInsttId;
    private String provdSysId;
    private String provdSvcId;
    private String requstInsttId;
    private String requstSysId;
    private String provdInsttNm;
    private String requstInsttNm;
}
