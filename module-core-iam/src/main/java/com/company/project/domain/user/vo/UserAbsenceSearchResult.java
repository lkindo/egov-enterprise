package com.company.project.domain.user.vo;

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
