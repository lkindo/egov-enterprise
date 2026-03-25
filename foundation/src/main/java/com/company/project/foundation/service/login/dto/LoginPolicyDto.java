package com.company.project.foundation.service.login.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 濡쒓????뺤콉 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginPolicyDto {
    /** ?????ID */
    private String emplyrId;
    /** ??????*/
    private String emplyrNm;
    /** IP ?뺣낫 */
    private String ipInfo;
    /** 以묐??濡쒓?????슜 ??? */
    private String dplctPermAt;
    /** ??븳 ??? */
    private String lmttAt;
    /** ?깅줉 ??? */
    private String regYn;
    /** ?깅줉??ID */
    private String frstRegisterId;
    /** ??젙??ID */
    private String lastUpdusrId;

    // Compatibility getters for legacy JSP
    public String getIpAdres() {
        return ipInfo;
    }

    public String getDplctLoginAt() {
        return dplctPermAt;
    }

    public String getLastUpdtPntTM() {
        return "";
    } // Placeholder as it might be from BaseTimeEntity or separate field
}
