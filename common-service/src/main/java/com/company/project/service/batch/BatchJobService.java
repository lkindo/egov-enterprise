package com.company.project.service.batch;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.batch.BatchJob;
import com.company.project.domain.batch.BatchJobRepository;
import com.company.project.service.batch.dto.BatchJobDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 배치작업 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BatchJobService implements EgovBatchJobService {

    private final BatchJobRepository batchJobRepository;

    @Override
    public Page<BatchJobDto> getBatchJobList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return batchJobRepository.findAll(pageable).map(BatchJobDto::from);
        }
        return batchJobRepository.findByBatchOpertNmContaining(keyword, pageable).map(BatchJobDto::from);
    }

    @Override
    public BatchJobDto getBatchJob(String batchOpertId) {
        BatchJob batchJob = batchJobRepository.findById(batchOpertId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return BatchJobDto.from(batchJob);
    }

    @Override
    @Transactional
    public String createBatchJob(String userId, BatchJobDto dto) {
        String batchOpertId = "BAT_" + String.format("%014d", System.currentTimeMillis());

        BatchJob batchJob = BatchJob.builder()
                .batchOpertId(batchOpertId)
                .batchOpertNm(dto.getBatchOpertNm())
                .batchProgrm(dto.getBatchProgrm())
                .paramtr(dto.getParamtr())
                .useAt(dto.getUseAt())
                .frstRegisterId(userId)
                .build();

        batchJobRepository.save(batchJob);
        return batchOpertId;
    }

    @Override
    @Transactional
    public void updateBatchJob(String batchOpertId, String userId, BatchJobDto dto) {
        BatchJob batchJob = batchJobRepository.findById(batchOpertId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        batchJob.update(dto.getBatchOpertNm(), dto.getBatchProgrm(), dto.getParamtr(),
                dto.getUseAt(), userId);
    }

    @Override
    @Transactional
    public void deleteBatchJob(String batchOpertId) {
        BatchJob batchJob = batchJobRepository.findById(batchOpertId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        batchJobRepository.delete(batchJob);
    }

    @Override
    public List<BatchJobDto> getActiveBatchJobs() {
        return batchJobRepository.findByUseAt("Y").stream()
                .map(BatchJobDto::from)
                .collect(Collectors.toList());
    }
}
