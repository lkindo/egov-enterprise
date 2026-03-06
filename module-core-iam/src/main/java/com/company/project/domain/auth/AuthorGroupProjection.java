package com.company.project.domain.auth;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthorGroupProjection {
    private String userId;
    private String userNm;
    private String groupId;
    private String mberTyCode;
    private String mberTyNm;
    private String authorCode;
    private String regYn;
    private String uniqId;
}
