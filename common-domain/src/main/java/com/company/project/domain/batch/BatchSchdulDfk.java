package com.company.project.domain.batch;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 배치스케줄요일 JPA Entity
 * 레거시 테이블: NBATCHSCHDULDFK
 */
@Entity
@Table(name = "NBATCHSCHDULDFK")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@IdClass(BatchSchdulDfkId.class)
public class BatchSchdulDfk {

    @Id
    @Column(name = "BATCH_SCHDUL_ID", length = 20)
    private String batchSchdulId;

    @Id
    @Column(name = "EXECUT_SCHDUL_DFK_SE", length = 2)
    private String executSchdulDfkSe;

    @Builder
    public BatchSchdulDfk(String batchSchdulId, String executSchdulDfkSe) {
        this.batchSchdulId = batchSchdulId;
        this.executSchdulDfkSe = executSchdulDfkSe;
    }
}
