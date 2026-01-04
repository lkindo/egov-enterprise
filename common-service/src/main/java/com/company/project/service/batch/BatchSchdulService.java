package com.company.project.service.batch;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.batch.BatchSchdul;
import com.company.project.domain.batch.BatchSchdulRepository;
import com.company.project.service.batch.dto.BatchSchdulDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 배치스케줄 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BatchSchdulService implements EgovBatchSchdulService {

    private final BatchSchdulRepository batchSchdulRepository;

    @Override
    public Page<BatchSchdulDto> getBatchSchdulList(String batchOpertId, Pageable pageable) {
        if (batchOpertId == null || batchOpertId.isEmpty()) {
            return batchSchdulRepository.findAll(pageable).map(BatchSchdulDto::from);
        }
        return batchSchdulRepository.findByBatchOpertId(batchOpertId, pageable).map(BatchSchdulDto::from);
    }

    @Override
    public BatchSchdulDto getBatchSchdul(String batchSchdulId) {
        BatchSchdul batchSchdul = batchSchdulRepository.findById(batchSchdulId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return BatchSchdulDto.from(batchSchdul);
    }

    @Override
    @Transactional
    public String createBatchSchdul(String userId, BatchSchdulDto dto) {
        String batchSchdulId = "BSCH_" + String.format("%014d", System.currentTimeMillis());

        BatchSchdul batchSchdul = BatchSchdul.builder()
                .batchSchdulId(batchSchdulId)
                .batchOpertId(dto.getBatchOpertId())
                .executCycle(dto.getExecutCycle())
                .executSchdulDe(dto.getExecutSchdulDe())
                .executSchdulHour(dto.getExecutSchdulHour())
                .executSchdulMnt(dto.getExecutSchdulMnt())
                .executSchdulSecnd(dto.getExecutSchdulSecnd())
                .frstRegisterId(userId)
                .build();

        batchSchdulRepository.save(batchSchdul);
        return batchSchdulId;
    }

    @Override
    @Transactional
    public void updateBatchSchdul(String batchSchdulId, String userId, BatchSchdulDto dto) {
        BatchSchdul batchSchdul = batchSchdulRepository.findById(batchSchdulId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // 업데이트 로직 (간략화)
        // 실제로는 별도의 update 메서드를 도메인에 추가하는 것이 좋음
        batchSchdulRepository.save(BatchSchdul.builder()
                .batchSchdulId(batchSchdulId)
                .batchOpertId(dto.getBatchOpertId())
                .executCycle(dto.getExecutCycle())
                .executSchdulDe(dto.getExecutSchdulDe())
                .executSchdulHour(dto.getExecutSchdulHour())
                .executSchdulMnt(dto.getExecutSchdulMnt())
                .executSchdulSecnd(dto.getExecutSchdulSecnd())
                .frstRegisterId(batchSchdul.getFrstRegisterId())
                .build());
    }

    @Override
    @Transactional
    public void deleteBatchSchdul(String batchSchdulId) {
        BatchSchdul batchSchdul = batchSchdulRepository.findById(batchSchdulId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        batchSchdulRepository.delete(batchSchdul);
    }
}
