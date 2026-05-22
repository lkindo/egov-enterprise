package nuri.foundation.service.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
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
    @JsonProperty("roleCode")
    private String roleId;
    
    /** 권한명 */
    private String roleNm;
    
    /** 권한패턴 */
    @JsonProperty("rolePttrn")
    private String rolePatrn;
    
    /** 권한설명 */
    @JsonProperty("roleDc")
    private String roleExpln;
    
    /** 권한유형 */
    @JsonProperty("roleTy")
    private String roleTypeCd;
    
    /** 권한정렬순서 */
    private String roleSort;
    
    /** 등록일시 */
    private String creatDt;

    // Manual getters to bypass potential Lombok issues
    public String getRoleId() {
        return roleId;
    }

    public String getRoleNm() {
        return roleNm;
    }

    public String getRolePatrn() {
        return rolePatrn;
    }

    public String getRoleExpln() {
        return roleExpln;
    }

    public String getRoleTypeCd() {
        return roleTypeCd;
    }

    public String getRoleSort() {
        return roleSort;
    }

    public String getCreatDt() {
        return creatDt;
    }

    // Manual setters to bypass potential Lombok issues
    public void setRoleId(String roleId) {
        this.roleId = roleId;
    }

    public void setRoleNm(String roleNm) {
        this.roleNm = roleNm;
    }

    public void setRolePatrn(String rolePatrn) {
        this.rolePatrn = rolePatrn;
    }

    public void setRoleExpln(String roleExpln) {
        this.roleExpln = roleExpln;
    }

    public void setRoleTypeCd(String roleTypeCd) {
        this.roleTypeCd = roleTypeCd;
    }

    public void setRoleSort(String roleSort) {
        this.roleSort = roleSort;
    }

    public void setCreatDt(String creatDt) {
        this.creatDt = creatDt;
    }

    // Compatibility getters for legacy JSP and other references
    @JsonIgnore
    public String getRoleCode() {
        return roleId;
    }

    @JsonIgnore
    public void setRoleCode(String roleCode) {
        this.roleId = roleCode;
    }

    @JsonIgnore
    public String getRolePttrn() {
        return rolePatrn;
    }

    @JsonIgnore
    public String getRoleDc() {
        return roleExpln;
    }

    @JsonIgnore
    public String getRoleTy() {
        return roleTypeCd;
    }

    @JsonIgnore
    public String getRoleTyp() {
        return roleTypeCd;
    }
    
    @JsonIgnore
    public String getRoleCreatDe() {
        return creatDt;
    }

    @JsonIgnore
    public String getRolePtn() {
        return rolePatrn;
    }
}
