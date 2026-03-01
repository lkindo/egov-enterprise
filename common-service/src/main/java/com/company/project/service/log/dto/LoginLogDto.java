package com.company.project.service.log.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * æ¿¡ì’“???æ¿¡ì’“??DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginLogDto {
    /** æ¿¡ì’“??ID */
    private String logId;
    /** ?ë¬’ëƒ½ ID */
    private String loginId;
    /** ?ë¬’ëƒ½ IP */
    private String loginIp;
    /** ?ë¬’ëƒ½ è«›â‘¸ì¾?*/
    private String loginMthd;
    /** ?ë¨?œ­ è«›ì’–ê¹???? */
    private String errOccrrAt;
    /** ?ë¨?œ­ ?„ë¶¾ë±?*/
    private String errorCode;
    /** ??¹ê½¦??±ë–† */
    private String creatDt;
}
