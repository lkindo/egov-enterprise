package com.company.project.domain.batch;

import com.company.project.TestJpaConfig;
import com.company.project.domain.code.CommonCode;
import com.company.project.domain.code.CommonCodeRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("Batch 관련 Repository 테스트")
class BatchRepositoryTest {

        @Autowired
        private BatchOpertRepository batchOpertRepository;

        @Autowired
        private BatchSchdulRepository batchSchdulRepository;

        @Autowired
        private BatchResultRepository batchResultRepository;

        @Autowired
        private CommonCodeRepository commonCodeRepository;

        @Test
        @DisplayName("배치작업 저장 및 조회 확인")
        void saveAndFindBatchOpert() {
                // Given
                BatchOpert opert = BatchOpert.builder()
                                .batchOpertId("BATCH_001")
                                .batchOpertNm("테스트 배치")
                                .batchProgrm("com.company.TestBatch")
                                .paramtr("--arg1=val1")
                                .useAt("Y")
                                .frstRegisterId("USER01")
                                .build();

                // When
                batchOpertRepository.save(opert);
                Optional<BatchOpert> found = batchOpertRepository.findById("BATCH_001");

                // Then
                assertThat(found).isPresent();
                assertThat(found.get().getBatchOpertNm()).isEqualTo("테스트 배치");
                assertThat(found.get().getParamtr()).isEqualTo("--arg1=val1");
                assertThat(found.get().getFrstRegisterId()).isEqualTo("USER01");
        }

        @Test
        @DisplayName("배치작업 정보 수정 확인")
        void updateBatchOpert() {
                // Given
                BatchOpert opert = BatchOpert.builder()
                                .batchOpertId("UPDATE_01")
                                .batchOpertNm("Old Name")
                                .build();
                batchOpertRepository.save(opert);

                // When
                BatchOpert saved = batchOpertRepository.findById("UPDATE_01").orElseThrow();
                saved.update("New Name", "New.Class", "-arg", "N", "ADMIN");
                batchOpertRepository.saveAndFlush(saved);

                // Then
                BatchOpert updated = batchOpertRepository.findById("UPDATE_01").orElseThrow();
                assertThat(updated.getBatchOpertNm()).isEqualTo("New Name");
                assertThat(updated.getUseAt()).isEqualTo("N");
                assertThat(updated.getLastUpdusrId()).isEqualTo("ADMIN");
                assertThat(updated.getLastUpdusrPnttm()).isNotNull();
        }

        @Test
        @DisplayName("배치스케줄 목록 조회 확인")
        void searchBatchSchduls() {
                // Given
                BatchOpert opert = BatchOpert.builder().batchOpertId("OP_01").batchOpertNm("Job 1").batchProgrm("P1")
                                .build();
                batchOpertRepository.save(opert);
                commonCodeRepository.save(CommonCode.builder().codeGroupId("COM047").code("01").codeNm("매일").build());

                batchSchdulRepository.save(BatchSchdul.builder()
                                .batchSchdulId("SCH_01")
                                .batchOpert(opert)
                                .executCycle("01")
                                .executSchdulHour("01")
                                .executSchdulMnt("00")
                                .executSchdulSecnd("00")
                                .build());

                // When
                Page<BatchSchdul> result = batchSchdulRepository.searchBatchSchduls("0", "Job 1",
                                PageRequest.of(0, 10));

                // Then
                assertThat(result.getTotalElements()).isEqualTo(1);
                assertThat(result.getContent().get(0).getBatchSchdulId()).isEqualTo("SCH_01");
                assertThat(foundSchdul(result).getExecutCycle()).isEqualTo("01");
        }

        private BatchSchdul foundSchdul(Page<BatchSchdul> result) {
                return result.getContent().get(0);
        }

        @Test
        @DisplayName("배치결과 목록 조회 확인")
        void searchBatchResults() {
                // Given
                BatchOpert opert = BatchOpert.builder().batchOpertId("OP_02").batchOpertNm("Job 2").build();
                batchOpertRepository.save(opert);
                commonCodeRepository.save(CommonCode.builder().codeGroupId("COM076").code("01").codeNm("성공").build());

                batchResultRepository.save(BatchResult.builder()
                                .batchResultId("RES_01")
                                .batchSchdulId("SCH_01")
                                .batchOpertId("OP_02")
                                .sttus("01")
                                .executBeginTime("20260301100000")
                                .executEndTime("20260301100500")
                                .errorInfo("No error")
                                .build());

                // When
                Page<BatchResult> result = batchResultRepository.searchBatchResults("00", "20260301", "20260301", "0",
                                "Job 2", PageRequest.of(0, 10));

                // Then
                assertThat(result.getTotalElements()).isEqualTo(1);
                assertThat(result.getContent().get(0).getBatchResultId()).isEqualTo("RES_01");
                assertThat(result.getContent().get(0).getErrorInfo()).isEqualTo("No error");
        }
}
