package com.company.project.domain.user.vo;

import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.UserAbsence;
import com.company.project.domain.user.entity.EnterpriseUser;
import com.company.project.domain.user.entity.GeneralUser;

import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.UserAbsence;
import com.company.project.domain.user.entity.EnterpriseUser;
import com.company.project.domain.user.entity.GeneralUser;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAbsenceSearchResult {
    private String userId;
    private String userNm;
    private String userAbsnceAt;
    private String regYn;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;
}
