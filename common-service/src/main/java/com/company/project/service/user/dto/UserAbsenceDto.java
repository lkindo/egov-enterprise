package com.company.project.service.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * ??????�??DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAbsenceDto {
    /** ?????ID */
    private String userId;
    /** ????�?�� */
    private String userNm;
    /** ?�????? */
    private String userAbsnceAt;
    /** ?깅줉 ??? */
    private String regYn;
    /** ?깅줉??ID */
    private String frstRegisterId;
    /** ??�젙??ID */
    private String lastUpdusrId;
    private String lastUpdusrPnttm;
}
