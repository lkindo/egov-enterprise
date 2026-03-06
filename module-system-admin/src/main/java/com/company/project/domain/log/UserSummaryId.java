package com.company.project.domain.log;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class UserSummaryId implements Serializable {
    private String occrrncDe;
    private String statsKind;
    private String detailStatsKind;
}
