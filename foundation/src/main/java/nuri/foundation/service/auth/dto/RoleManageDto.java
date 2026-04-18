package nuri.foundation.service.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 권한 정보 DTO
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleManageDto {
    /** 권한코드 */
    private String roleCode;
    /** 권한명 */
    private String roleNm;
    /** 권한패턴 */
    private String rolePttrn;
    /** 권한설명 */
    private String roleDc;
    /** 권한유형 */
    private String roleTy;
    /** 권한정렬순서 */
    private String roleSort;
    /** 등록일시 */
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
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getRoleTyp() {
        return roleTy;
    }
    
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getRoleCreatDe() {
        return creatDt;
    }

    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getRolePtn() {
        return rolePttrn;
    }
}
