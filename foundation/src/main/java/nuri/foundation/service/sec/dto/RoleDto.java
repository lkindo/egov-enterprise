package nuri.foundation.service.sec.dto;

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
    private String roleCreatDe;
}
