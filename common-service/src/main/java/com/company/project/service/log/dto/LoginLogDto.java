package com.company.project.service.log.dto;

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
    private String logId;
    /** 접속 ID */
    private String loginId;
    /** 접속 IP */
    private String loginIp;
    /** 접속 방법 */
    private String loginMthd;
    /** 에러 발생 여부 */
    private String errOccrrAt;
    /** 에러 코드 */
    private String errorCode;
    /** 생성일시 */
    private String creatDt;
}
