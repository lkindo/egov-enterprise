package com.company.project.service.log.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 시스템 로그 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SysLogDto {
    /** 요청 ID */
    private String requstId;
    /** 서비스명 */
    private String srvcNm;
    /** 메서드명 */
    private String methodNm;
    /** 처리구분코드 */
    private String processSeCode;
    /** 처리시간 */
    private String processTime;
    /** 요청자ID */
    private String rqesterId;
    /** 요청자IP */
    private String rqesterIp;
    /** 발생일 */
    private String occrrncDe;
}
