package com.company.project.foundation.domain.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthorGroupSearchResult {
    private String userId;
    private String userNm;
    private String groupId;
    private String mberTyCode;
    private String mberTyNm;
    private String authorCode;
    private String regYn;
    private String uniqId;
}
