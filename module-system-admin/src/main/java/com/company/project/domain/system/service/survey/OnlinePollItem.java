package com.company.project.domain.system.service.survey;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.SuperBuilder;

/**
 * 온라인 폴 항목 엔티티
 * 매핑 테이블: NONLINEPOLLIEM
 */
@Entity
@Table(name = "NONLINEPOLLIEM")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@SuperBuilder
public class OnlinePollItem extends BaseEntity {

    @Id
    @Column(name = "POLL_IEM_ID", length = 20)
    private String pollIemId;

    @Column(name = "POLL_ID", length = 20, nullable = false)
    private String pollId;

    @Column(name = "POLL_IEM_NM", length = 255, nullable = false)
    private String pollIemNm;

    public void update(String pollIemNm) {
        this.pollIemNm = pollIemNm;
    }
}
