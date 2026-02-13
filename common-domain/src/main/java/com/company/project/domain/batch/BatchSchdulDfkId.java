package com.company.project.domain.batch;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 배치스케줄요일 복합키 클래스
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class BatchSchdulDfkId implements Serializable {

    @Column(name = "BATCH_SCHDUL_ID", length = 20)
    private String batchSchdulId;

    @Column(name = "EXECUT_SCHDUL_DFK_SE", length = 2)
    private String executSchdulDfkSe;
}
