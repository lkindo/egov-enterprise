package com.company.project.service.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 濡?愿由?DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleManageDto {
    /** 濡?肄붾뱶 */
    private String roleCode;
    /** 濡?紐?*/
    private String roleNm;
    /** 濡??⑦꽩 */
    private String rolePttrn;
    /** 濡??ㅻ챸 */
    private String roleDc;
    /** 濡??좏삎 */
    private String roleTy;
    /** 濡??뺣젹?쒖꽌 */
    private String roleSort;
    /** ?앹꽦?쇱떆 */
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
