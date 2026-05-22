package nuri.foundation.service.sec.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleDto {
    private String roleId;
    private String roleNm;
    private String rolePatrn;
    private String roleExpln;
    private String roleTypeCd;
    private String roleSort;
    private String roleCrtYmd;

    @JsonIgnore
    public String getRoleCreatDe() {
        return roleCrtYmd;
    }

    @JsonIgnore
    public void setRoleCreatDe(String roleCreatDe) {
        this.roleCrtYmd = roleCreatDe;
    }
}
