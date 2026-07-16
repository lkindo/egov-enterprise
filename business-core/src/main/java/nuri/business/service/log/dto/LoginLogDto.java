package nuri.business.service.log.dto;

import jakarta.validation.constraints.*;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 로그인 로그 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginLogDto {
    /** 로그 ID */
    @Size(max = 20)
    private String logId;
    /** 접속 ID */
    private String loginId;
    /** 접속 IP */
    private String loginIp;
    /** 접속방식 */
    private String loginMthd;
    /** 오류발생여부 */
    private String errOccrrAt;
    /** 오류코드 */
    private String errorCode;
    /** 생성일시 */
    private String creatDt;

}
