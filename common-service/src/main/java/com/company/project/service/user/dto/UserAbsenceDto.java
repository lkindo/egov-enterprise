package com.company.project.service.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * ??????∫¬Ä??DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAbsenceDto {
    /** ?????ID */
    private String userId;
    /** ????Î®?±∏ */
    private String userNm;
    /** ?∫¬Ä????? */
    private String userAbsnceAt;
    /** ?ÍπÖÏ§â ??? */
    private String regYn;
    /** ?ÍπÖÏ§â??ID */
    private String frstRegisterId;
    /** ??èÏ†ô??ID */
    private String lastUpdusrId;
    private String lastUpdusrPnttm;
}
