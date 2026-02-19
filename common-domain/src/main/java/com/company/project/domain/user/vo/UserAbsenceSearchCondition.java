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

import lombok.Data;

@Data
public class UserAbsenceSearchCondition {
    private String searchCondition;
    private String searchKeyword;
    private String selAbsnceAt; // Filter by absence status
}
