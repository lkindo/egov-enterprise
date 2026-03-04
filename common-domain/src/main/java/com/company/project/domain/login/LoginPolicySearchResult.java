package com.company.project.domain.login;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginPolicySearchResult {
    private String emplyrId; // User ID
    private String userNm; // User Name
    private String userSe; // User Se
    private String ipInfo;
    private String dplctPermAt;
    private String lmttAt;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;
    private String regYn; // Y or N
}