package com.company.project.domain.auth;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MenuAuthorityProjection {
    private String authorCode;
    private Long menuNo;
    private String menuNm;
    private Long upperMenuNo;
    private String regYn;
}
