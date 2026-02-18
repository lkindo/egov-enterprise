package com.company.project.service.batch;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.batch.BatchOpert;
import com.company.project.domain.batch.BatchOpertRepository;
import com.company.project.service.batch.dto.BatchOpertDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 배치작업 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BatchOpertService implements EgovBatchOpertService {

    private final BatchOpertRepository batchOpertRepository;

    @Override
    public Page<BatchOpertDto> getBatchOpertList(String searchCondition, String keyword,
            @NonNull Pageable pageable) {
        return batchOpertRepository
                .searchBatchOperts(searchCondition, keyword, Objects.requireNonNull(pageable))
                .map(BatchOpertDto::from);
    }

    @Override
    public BatchOpertDto getBatchOpert(String batchOpertId) {
        return batchOpertRepository.findById(Objects.requireNonNull(batchOpertId))
                .map(BatchOpertDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createBatchOpert(String userId, BatchOpertDto dto) {
        String id = "BOP_" + String.format("%014d", System.currentTimeMillis());
        BatchOpert batchOpert = BatchOpert.builder()
                .batchOpertId(id)
                .batchOpertNm(dto.getBatchOpertNm())
                .batchProgrm(dto.getBatchProgrm())
                .paramtr(dto.getParamtr())
                .useAt(dto.getUseAt())
                .frstRegisterId(userId)
                .build();
        batchOpertRepository.save(Objects.requireNonNull(batchOpert));
        return id;
    }

    @Override
    @Transactional
    public void updateBatchOpert(String batchOpertId, String userId, BatchOpertDto dto) {
        BatchOpert batchOpert = batchOpertRepository.findById(Objects.requireNonNull(batchOpertId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        batchOpert.update(dto.getBatchOpertNm(), dto.getBatchProgrm(), dto.getParamtr(),
                dto.getUseAt(), userId);
    }

    @Override
    @Transactional
    public void deleteBatchOpert(String batchOpertId) {
        batchOpertRepository.deleteById(Objects.requireNonNull(batchOpertId));
    }

    @Override
    public List<BatchOpertDto> getActiveBatchOperts() {
        return batchOpertRepository.findAll().stream()
                .filter(e -> "Y".equals(e.getUseAt()))
                .map(BatchOpertDto::from)
                .collect(Collectors.toList());
    }
}
