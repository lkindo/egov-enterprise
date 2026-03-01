package com.company.project.service.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Êø??ø¬Ä??DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleManageDto {
    /** Êø??ÑÎ∂æÎ±?*/
    private String roleCode;
    /** Êø?Ôß?*/
    private String roleNm;
    /** Êø????Ω© */
    private String rolePttrn;
    /** Êø???ªÏ±∏ */
    private String roleDc;
    /** Êø??Ï¢èÏÇé */
    private String roleTy;
    /** Êø??Î∫£Ï†π??ñÍΩå */
    private String roleSort;
    /** ??πÍΩ¶??±ÎñÜ */
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
