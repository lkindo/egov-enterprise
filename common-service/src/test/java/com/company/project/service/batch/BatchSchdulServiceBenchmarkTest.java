package com.company.project.service.batch;

import com.company.project.BenchmarkTestConfig;
import com.company.project.domain.batch.BatchJob;
import com.company.project.domain.batch.BatchJobRepository;
import com.company.project.domain.batch.BatchSchdul;
import com.company.project.domain.batch.BatchSchdulDfk;
import com.company.project.domain.batch.BatchSchdulRepository;
import com.company.project.service.batch.dto.BatchSchdulDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = BenchmarkTestConfig.class)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@EntityScan(basePackages = "com.company.project.domain")
@EnableJpaRepositories(basePackages = "com.company.project.domain")
@Import(BatchSchdulService.class)
public class BatchSchdulServiceBenchmarkTest {

    @Autowired
    private BatchSchdulService batchSchdulService;

    @Autowired
    private BatchSchdulRepository batchSchdulRepository;

    @Autowired
    private BatchJobRepository batchJobRepository;

    @Test
    @Transactional
    public void testGetBatchSchdulListPerformance() {
        // Given
        int count = 200;

        // Create BatchJob
        BatchJob job = BatchJob.builder()
                .batchOpertId("JOB_TEST")
                .batchOpertNm("Test Job")
                .batchProgrm("Test Program")
                .build();
        batchJobRepository.save(job);

        List<BatchSchdul> schduls = new ArrayList<>();

        for (int i = 0; i < count; i++) {
            String id = "BSCH_" + String.format("%014d", System.currentTimeMillis() + i);
            BatchSchdul schdul = BatchSchdul.builder()
                    .batchSchdulId(id)
                    .batchOpertId("JOB_TEST")
                    .executCycle("02") // Weekly
                    .build();

            // Add 5 DFKs
            for (int j = 1; j <= 5; j++) {
                schdul.getBatchSchdulDfks().add(BatchSchdulDfk.builder()
                        .batchSchdulId(id)
                        .executSchdulDfkSe("0" + j)
                        .build());
            }
            schduls.add(schdul);
        }

        batchSchdulRepository.saveAll(schduls);
        batchSchdulRepository.flush();

        Pageable pageable = PageRequest.of(0, count);

        // When
        long startTime = System.currentTimeMillis();
        Page<BatchSchdulDto> result = batchSchdulService.getBatchSchdulList(null, null, pageable);
        long endTime = System.currentTimeMillis();

        // Then
        long duration = endTime - startTime;
        System.out.println("Execution time for fetching " + count + " records with DFKs: " + duration + " ms");

        assertThat(result.getContent()).hasSize(count);

        if (!result.getContent().isEmpty()) {
            BatchSchdulDto first = result.getContent().get(0);
            assertThat(first.getExecutSchdulDfkSes()).hasSize(5);
        }
    }
}
