package com.company.project.domain.schedule;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 간부 상태 정보 Entity
 * 레거시 테이블: NLEADERSTTUS
 */
@Entity
@Table(name = "NLEADERSTTUS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LeaderStatus extends BaseEntity {

    @Id
    @Column(name = "LEADER_ID", length = 20)
    private String leaderId;

    @Column(name = "LEADER_STTUS", length = 1)
    private String leaderSttus;

    @Builder
    public LeaderStatus(String leaderId, String leaderSttus) {
        this.leaderId = leaderId;
        this.leaderSttus = leaderSttus;
    }

    public void updateStatus(String leaderSttus) {
        this.leaderSttus = leaderSttus;
    }
}
