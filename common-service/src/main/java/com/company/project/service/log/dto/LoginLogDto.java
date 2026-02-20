package com.company.project.service.log.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 濡쒓렇??濡쒓렇 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginLogDto {
    /** 濡쒓렇 ID */
    private String logId;
    /** ?묒냽 ID */
    private String loginId;
    /** ?묒냽 IP */
    private String loginIp;
    /** ?묒냽 諛⑸쾿 */
    private String loginMthd;
    /** ?먮윭 諛쒖깮 ?щ? */
    private String errOccrrAt;
    /** ?먮윭 肄붾뱶 */
    private String errorCode;
    /** ?앹꽦?쇱떆 */
    private String creatDt;
}
