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

    // Manual getters to bypass potential Lombok issues
    public String getRoleCode() {
        return roleCode;
    }

    public String getRoleNm() {
        return roleNm;
    }

    public String getRolePttrn() {
        return rolePttrn;
    }

    public String getRoleDc() {
        return roleDc;
    }

    public String getRoleTy() {
        return roleTy;
    }

    public String getRoleSort() {
        return roleSort;
    }

    public String getCreatDt() {
        return creatDt;
    }

    // Compatibility getters for legacy JSP
    public String getRoleTyp() {
        return roleTy;
    }

    public String getRoleCreatDe() {
        return creatDt;
    }

    public String getRolePtn() {
        return rolePttrn;
    }
}
