package com.company.project.domain.survey;

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
 * 온라인 투표 결과 정보 Entity
 * 레거시 테이블: NONLINEPOLLRESULT
 */
@Entity
@Table(name = "NONLINEPOLLRESULT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OnlinePollResult extends BaseEntity {

    @Id
    @Column(name = "POLL_RESULT_ID", length = 20)
    private String pollResultId;

    @Column(name = "POLL_ID", length = 20, nullable = false)
    private String pollId;

    @Column(name = "POLL_IEM_ID", length = 20, nullable = false)
    private String pollIemId;

    @Builder
    public OnlinePollResult(String pollResultId, String pollId, String pollIemId, String frstRegisterId) {
        this.pollResultId = pollResultId;
        this.pollId = pollId;
        this.pollIemId = pollIemId;
        this.createdBy = frstRegisterId;
    }
}
