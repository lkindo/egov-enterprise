package nuri.foundation.service.login.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 로그인 정책 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginPolicyDto {
    /** 사용자 ID */
    private String emplyrId;
    /** 사용자명 */
    private String emplyrNm;
    /** IP 정보 */
    private String ipInfo;
    /** 중복 로그인 허용 여부 */
    private String dplctPermAt;
    /** 제한 여부 */
    private String lmttAt;
    /** 접속 시작 시간 (HH:mm) */
    private String startTime;
    /** 접속 종료 시간 (HH:mm) */
    private String endTime;
    /** OTP 사용 여부 */
    private String otpEnabledAt;
    /** 등록 여부 */
    private String regYn;
    /** 등록자 ID */
    private String frstRegisterId;
    /** 수정자 ID */
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
