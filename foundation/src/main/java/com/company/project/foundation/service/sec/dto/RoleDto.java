package com.company.project.foundation.service.sec.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleDto {
    private String roleCode;
    private String roleNm;
    private String rolePtn;
    private String roleDc;
    private String roleTyp;
    private String roleSort;
    private String roleCreatDe;
}
