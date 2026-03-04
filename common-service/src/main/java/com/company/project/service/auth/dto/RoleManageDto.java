package com.company.project.service.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * ????DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleManageDto {
    /** ??붾?*/
    private String roleCode;
    /** ??*/
    private String roleNm;
    /** ???? */
    private String rolePttrn;
    /** ???챸 */
    private String roleDc;
    /** ??좏삎 */
    private String roleTy;
    /** ??뺣젹??꽌 */
    private String roleSort;
    /** ??꽦??떆 */
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