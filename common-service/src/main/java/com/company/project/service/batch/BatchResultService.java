package com.company.project.service.batch;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.batch.BatchResult;
import com.company.project.domain.batch.BatchResultRepository;
import com.company.project.service.batch.dto.BatchResultDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 배치결과 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BatchResultService implements EgovBatchResultService {

    private final BatchResultRepository batchResultRepository;

    @Override
    public Page<BatchResultDto> getBatchResultList(String batchSchdulId, Pageable pageable) {
        if (batchSchdulId == null || batchSchdulId.isEmpty()) {
            return batchResultRepository.findAll(pageable).map(BatchResultDto::from);
        }
        return batchResultRepository.findByBatchSchdulId(batchSchdulId, pageable).map(BatchResultDto::from);
    }

    @Override
    public BatchResultDto getBatchResult(String batchResultId) {
        BatchResult batchResult = batchResultRepository.findById(batchResultId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return BatchResultDto.from(batchResult);
    }

    @Override
    @Transactional
    public void deleteBatchResult(String batchResultId) {
        BatchResult batchResult = batchResultRepository.findById(batchResultId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        batchResultRepository.delete(batchResult);
    }
}
