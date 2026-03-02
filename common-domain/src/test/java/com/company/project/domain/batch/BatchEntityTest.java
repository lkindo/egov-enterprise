package com.company.project.domain.batch;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BatchEntityTest {

    @Test
    @DisplayName("BatchOpert 엔티티 생성 테스트")
    void batchOpertTest() {
        BatchOpert opert = BatchOpert.builder()
                .batchOpertId("BATCH_01")
                .batchOpertNm("Daily Job")
                .batchProgrm("com.test.Job")
                .useAt("Y")
                .build();

        assertThat(opert.getBatchOpertId()).isEqualTo("BATCH_01");
        assertThat(opert.getBatchOpertNm()).isEqualTo("Daily Job");
    }

    @Test
    @DisplayName("BatchResult 엔티티 필드 매핑 테스트")
    void batchResultTest() {
        BatchResult result = BatchResult.builder()
                .batchResultId("RES_01")
                .sttus("01")
                .executBeginTime("20240302100000")
                .executEndTime("20240302100500")
                .build();

        assertThat(result.getBatchResultId()).isEqualTo("RES_01");
        assertThat(result.getSttus()).isEqualTo("01");
        assertThat(result.getExecutBeginTime()).isEqualTo("20240302100000");
    }
}
