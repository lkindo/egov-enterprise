package com.company.project.domain.batch;

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
public class BatchSchdulDfkId implements Serializable {
    private String batchSchdulId;
    private String executSchdulDfkSe;
}
