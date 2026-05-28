package nuri.foundation.service.login.dto;

import jakarta.validation.constraints.*;

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
    @Size(max = 20)
    @NotBlank
    private String userId;
    /** 사용자명 */
    @Size(max = 100)
    private String userNm;
    /** IP 주소 */
    @Size(max = 30)
    private String ipAddr;
    /** 중복 로그인 허용 여부 */
    @Size(max = 1)
    private String dpcnPrmYn;
    /** 제한 여부 */
    @Size(max = 1)
    private String lmtYn;
    /** 접속 시작 시간 (HH:mm) */
    @Size(max = 6)
    private String bgngTm;
    /** 접속 종료 시간 (HH:mm) */
    @Size(max = 6)
    private String endTm;
    /** OTP 사용 여부 */
    @Size(max = 1)
    private String otpUseYn;
    /** 등록 여부 */
    private String regYn;
    /** 등록자 ID */
    private String frstRegisterId;
    /** 수정자 ID */
    private String lastUpdusrId;

    // Compatibility getters
    public String getEmplyrId() { return userId; }
    public String getEmplyrNm() { return userNm; }
    public String getIpInfo() { return ipAddr; }
    public String getDplctPermAt() { return dpcnPrmYn; }
    public String getLmttAt() { return lmtYn; }
    public String getStartTime() { return bgngTm; }
    public String getEndTime() { return endTm; }
    public String getOtpEnabledAt() { return otpUseYn; }
    
    public String getIpAdres() { return ipAddr; }
    public String getDplctLoginAt() { return dpcnPrmYn; }
}
