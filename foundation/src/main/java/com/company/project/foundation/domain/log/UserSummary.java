package com.company.project.foundation.domain.log;
import com.company.project.foundation.domain.common.BaseEntity;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import lombok.experimental.SuperBuilder;

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
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "SUSERSUMMARY")
@IdClass(UserSummaryId.class)
@SuperBuilder
public class UserSummary extends BaseEntity {

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
