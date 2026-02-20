package com.company.project.service.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * ?ъ슜??遺??DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAbsenceDto {
    /** ?ъ슜??ID */
    private String userId;
    /** ?ъ슜?먮챸 */
    private String userNm;
    /** 遺???щ? */
    private String userAbsnceAt;
    /** ?깅줉 ?щ? */
    private String regYn;
    /** ?깅줉??ID */
    private String frstRegisterId;
    /** ?섏젙??ID */
    private String lastUpdusrId;
    private String lastUpdusrPnttm;
}
