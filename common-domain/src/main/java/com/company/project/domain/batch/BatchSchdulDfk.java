package com.company.project.domain.batch;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 獄쏄퀣????餓κ쑴???JPA Entity
 * ??뉕탢?????뵠?? NBATCHSCHDULDFK
 */
@Entity
@Table(name = "NBATCHSCHDULDFK")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BatchSchdulDfk {

    @EmbeddedId
    private BatchSchdulDfkId id;

    @MapsId("batchSchdulId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "BATCH_SCHDUL_ID")
    private BatchSchdul batchSchdul;

    @Builder
    public BatchSchdulDfk(String batchSchdulId, String executSchdulDfkSe, BatchSchdul batchSchdul) {
        this.id = new BatchSchdulDfkId(batchSchdulId, executSchdulDfkSe);
        this.batchSchdul = batchSchdul;
    }

    public String getBatchSchdulId() {
        return id != null ? id.getBatchSchdulId() : null;
    }

    public String getExecutSchdulDfkSe() {
        return id != null ? id.getExecutSchdulDfkSe() : null;
    }
}