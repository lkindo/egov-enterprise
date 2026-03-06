package com.company.project.domain.user.vo;

import lombok.Data;

@Data
public class UserAbsenceSearchCondition {
    private String searchCondition;
    private String searchKeyword;
    private String selAbsnceAt; // Filter by absence status
}
