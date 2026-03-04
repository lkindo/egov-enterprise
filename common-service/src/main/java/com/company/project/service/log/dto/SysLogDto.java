package com.company.project.service.log.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * ??뒪??濡쒓??DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SysLogDto {
    /** ?붿껌 ID */
    private String requstId;
    /** ??퉬??챸 */
    private String srvcNm;
    /** 硫붿??챸 */
    private String methodNm;
    /** 泥섎?援??肄붾뱶 */
    private String processSeCode;
    /** 泥섎???컙 */
    private String processTime;
    /** ?붿껌?륤D */
    private String rqesterId;
    /** ?붿껌?륤P */
    private String rqesterIp;
    /** 諛쒖??*/
    private String occrrncDe;
}
