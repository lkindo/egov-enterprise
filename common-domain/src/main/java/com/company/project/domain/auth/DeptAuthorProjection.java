package com.company.project.domain.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeptAuthorProjection {
    private String deptCode;
    private String deptNm;
    private String userId;
    private String userNm;
    private String authorCode;
    private String uniqId;
    private String regYn;
}
