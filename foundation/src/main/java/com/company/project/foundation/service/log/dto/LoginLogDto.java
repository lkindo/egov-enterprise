package com.company.project.foundation.service.log.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 濡쒓???濡쒓??DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginLogDto {
    /** 濡쒓??ID */
    private String logId;
    /** ?묒냽 ID */
    private String loginId;
    /** ?묒냽 IP */
    private String loginIp;
    /** ?묒냽 諛⑸?*/
    private String loginMthd;
    /** ?? 諛쒖???? */
    private String errOccrrAt;
    /** ?? ?붾?*/
    private String errorCode;
    /** ??꽦??떆 */
    private String creatDt;
}
