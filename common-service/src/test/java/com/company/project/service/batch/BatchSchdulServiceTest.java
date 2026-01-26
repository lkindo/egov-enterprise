package com.company.project.service.batch;

import com.company.project.domain.batch.BatchJob;
import com.company.project.domain.batch.BatchJobRepository;
import com.company.project.domain.batch.BatchSchdul;
import com.company.project.domain.batch.BatchSchdulRepository;
import com.company.project.service.batch.dto.BatchSchdulDto;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BatchSchdulServiceTest {

    @Mock
    private BatchSchdulRepository batchSchdulRepository;

    @Mock
    private BatchJobRepository batchJobRepository;

    @Mock
    private EgovCommonCodeService commonCodeService;

    @InjectMocks
    private BatchSchdulService batchSchdulService;

    @Test
    @DisplayName("Verify N+1 query issue is resolved in getBatchSchdulList")
    void verifyOptimization() {
        // given
        int entityCount = 5;
        List<BatchSchdul> schduls = IntStream.range(0, entityCount)
                .mapToObj(i -> BatchSchdul.builder()
                        .batchSchdulId("SCH_" + i)
                        .batchOpertId("JOB_" + i)
                        .executCycle("01")
                        .build())
                .toList();

        Page<BatchSchdul> page = new PageImpl<>(schduls);
        Pageable pageable = PageRequest.of(0, 10);

        when(batchSchdulRepository.searchBatchSchduls(any(), any(), eq(pageable))).thenReturn(page);

        // Mock common codes
        when(commonCodeService.getCodesByGroup(anyString())).thenReturn(Collections.emptyList());

        // Mock job repository to return list of jobs for findAllById
        when(batchJobRepository.findAllById(any())).thenAnswer(invocation -> {
            Iterable<String> ids = invocation.getArgument(0);
            List<BatchJob> jobs = new java.util.ArrayList<>();
            ids.forEach(id -> jobs.add(BatchJob.builder().batchOpertId(id).batchOpertNm("Job Name " + id).build()));
            return jobs;
        });

        // Mock DFK repository call
        when(batchSchdulRepository.findAllDfksByBatchSchdulIdIn(any())).thenReturn(Collections.emptyList());

        // when
        Page<BatchSchdulDto> result = batchSchdulService.getBatchSchdulList(null, null, pageable);

        // then
        // Verify that findAllById is called once
        verify(batchJobRepository, times(1)).findAllById(any());
        // Verify that findAllDfksByBatchSchdulIdIn is called once
        verify(batchSchdulRepository, times(1)).findAllDfksByBatchSchdulIdIn(any());

        // Verify that findById is NOT called
        verify(batchJobRepository, never()).findById(anyString());

        // Additional verification: Check if data is correctly mapped
        result.getContent().forEach(dto -> {
            if ("JOB_0".equals(dto.getBatchOpertId())) {
                org.junit.jupiter.api.Assertions.assertEquals("Job Name JOB_0", dto.getBatchOpertNm());
            }
        });
    }
}
