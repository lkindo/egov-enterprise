package com.company.project.service.integration.dto;

import com.company.project.domain.integration.SystemCntc;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SystemCntcDto {
    private String cntcId;
    private String cntcNm;
    private String cntcType;
    private String provdInsttId;
    private String provdSysId;
    private String requstInsttId;
    private String requstSysId;
    private String useAt;
    private String confmAt;

    public static SystemCntcDto from(SystemCntc entity) {
        if (entity == null) return null;
        return SystemCntcDto.builder()
                .cntcId(entity.getCntcId())
                .cntcNm(entity.getCntcNm())
                .cntcType(entity.getCntcType())
                .provdInsttId(entity.getProvdSys() != null && entity.getProvdSys().getInstt() != null ? entity.getProvdSys().getInstt().getInsttId() : null)
                .provdSysId(entity.getProvdSys() != null ? entity.getProvdSys().getSysId() : null)
                .requstInsttId(entity.getRequstSys() != null && entity.getRequstSys().getInstt() != null ? entity.getRequstSys().getInstt().getInsttId() : null)
                .requstSysId(entity.getRequstSys() != null ? entity.getRequstSys().getSysId() : null)
                .useAt(entity.getUseAt())
                .confmAt(entity.getConfmAt())
                .build();
    }
}