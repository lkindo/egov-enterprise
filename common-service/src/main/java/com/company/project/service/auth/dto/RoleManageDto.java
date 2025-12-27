package com.company.project.service.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 롤 관리 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleManageDto {
    /** 롤 코드 */
    private String roleCode;
    /** 롤 명 */
    private String roleNm;
    /** 롤 패턴 */
    private String rolePttrn;
    /** 롤 설명 */
    private String roleDc;
    /** 롤 유형 */
    private String roleTy;
    /** 롤 정렬순서 */
    private String roleSort;
    /** 생성일시 */
    private String creatDt;

    // Compatibility getters for legacy JSP
    public String getRoleTyp() {
        return roleTy;
    }

    public String getRoleCreatDe() {
        return creatDt;
    }
}
