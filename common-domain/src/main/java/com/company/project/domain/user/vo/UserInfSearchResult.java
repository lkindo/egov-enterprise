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
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserInfSearchResult {
    private String uniqId;
    private String userId;
    private String userNm;
    private String userZip;
    private String userAdres;
    private String userEmail;
    private String useAt;
    private String trgetId;
}
