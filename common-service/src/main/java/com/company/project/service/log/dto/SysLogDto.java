package com.company.project.service.log.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * ?쒖뒪??濡쒓렇 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SysLogDto {
    /** ?붿껌 ID */
    private String requstId;
    /** ?쒕퉬?ㅻ챸 */
    private String srvcNm;
    /** 硫붿꽌?쒕챸 */
    private String methodNm;
    /** 泥섎━援щ텇肄붾뱶 */
    private String processSeCode;
    /** 泥섎━?쒓컙 */
    private String processTime;
    /** ?붿껌?륤D */
    private String rqesterId;
    /** ?붿껌?륤P */
    private String rqesterIp;
    /** 諛쒖깮??*/
    private String occrrncDe;
}
