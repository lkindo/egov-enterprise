package com.company.project.domain.system.service.survey;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 온라인 폴 결과 엔티티
 * 매핑 테이블: NONLINEPOLLRESULT
 */
@Entity
@Table(name = "NONLINEPOLLRESULT")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class OnlinePollResult extends BaseEntity {

    @Id
    @Column(name = "POLL_RESULT_ID", length = 20)
    private String pollResultId;

    @Column(name = "POLL_ID", length = 20, nullable = false)
    private String pollId;

    @Column(name = "POLL_IEM_ID", length = 20, nullable = false)
    private String pollIemId;
}
