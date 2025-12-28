package com.company.project.domain.log;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "COMTSUSERSUMMARY")
@IdClass(UserSummaryId.class)
public class UserSummary {

    @Id
    @Column(name = "OCCRRNC_DE", length = 20)
    private String occrrncDe;

    @Id
    @Column(name = "STATS_SE", length = 10)
    private String statsKind;

    @Id
    @Column(name = "DETAIL_STATS_SE", length = 10)
    private String detailStatsKind;

    @Column(name = "USER_CO")
    private Long userCo;
}
