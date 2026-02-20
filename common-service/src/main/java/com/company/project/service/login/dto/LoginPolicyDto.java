package com.company.project.service.login.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 濡쒓렇???뺤콉 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginPolicyDto {
    /** ?ъ슜??ID */
    private String emplyrId;
    /** ?ъ슜??紐?*/
    private String emplyrNm;
    /** IP ?뺣낫 */
    private String ipInfo;
    /** 以묐났 濡쒓렇???덉슜 ?щ? */
    private String dplctPermAt;
    /** ?쒗븳 ?щ? */
    private String lmttAt;
    /** ?깅줉 ?щ? */
    private String regYn;
    /** ?깅줉??ID */
    private String frstRegisterId;
    /** ?섏젙??ID */
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
