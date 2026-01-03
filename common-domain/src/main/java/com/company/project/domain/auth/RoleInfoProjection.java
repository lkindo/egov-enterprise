package com.company.project.domain.auth;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RoleInfoProjection {
    private String roleCode;
    private String roleNm;
    private String rolePttrn;
    private String roleDc;
    private String roleTy;
    private String roleTyNm;
    private String roleSort;
    private LocalDateTime creatDt;
}
