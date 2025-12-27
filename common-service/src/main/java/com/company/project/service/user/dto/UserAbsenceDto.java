package com.company.project.service.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 사용자 부재 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAbsenceDto {
    /** 사용자 ID */
    private String userId;
    /** 사용자명 */
    private String userNm;
    /** 부재 여부 */
    private String userAbsnceAt;
    /** 등록 여부 */
    private String regYn;
    /** 등록자 ID */
    private String frstRegisterId;
    /** 수정자 ID */
    private String lastUpdusrId;
    private String lastUpdusrPnttm;
}
