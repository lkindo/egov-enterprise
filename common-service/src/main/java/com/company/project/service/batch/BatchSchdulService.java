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
    private final com.company.project.domain.batch.BatchJobRepository batchJobRepository;
    private final com.company.project.service.code.EgovCommonCodeService commonCodeService;

    @Override
    public Page<BatchSchdulDto> getBatchSchdulList(String searchCondition, String searchKeyword, Pageable pageable) {
        Page<com.company.project.domain.batch.BatchSchdul> entities = batchSchdulRepository
                .searchBatchSchduls(searchCondition, searchKeyword, pageable);

        // Get common codes for cycle names and day of week names
        java.util.Map<String, String> cycleMap = getCodeMap("COM047");
        java.util.Map<String, String> dfkMap = getCodeMap("COM074");

        return entities.map(entity -> convertToDto(entity, cycleMap, dfkMap));
    }

    @Override
    public BatchSchdulDto getBatchSchdul(String batchSchdulId) {
        com.company.project.domain.batch.BatchSchdul entity = batchSchdulRepository.findById(batchSchdulId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        java.util.Map<String, String> cycleMap = getCodeMap("COM047");
        java.util.Map<String, String> dfkMap = getCodeMap("COM074");

        return convertToDto(entity, cycleMap, dfkMap);
    }

    private java.util.Map<String, String> getCodeMap(String codeGroupId) {
        return commonCodeService.getCodesByGroup(codeGroupId).stream()
                .collect(java.util.stream.Collectors.toMap(com.company.project.service.code.dto.CommonCodeDto::getCode,
                        com.company.project.service.code.dto.CommonCodeDto::getCodeNm, (a, b) -> a));
    }

    private BatchSchdulDto convertToDto(com.company.project.domain.batch.BatchSchdul entity,
            java.util.Map<String, String> cycleMap, java.util.Map<String, String> dfkMap) {
        String batchOpertNm = "";
        String batchProgrm = "";
        com.company.project.domain.batch.BatchJob job = batchJobRepository.findById(entity.getBatchOpertId())
                .orElse(null);
        if (job != null) {
            batchOpertNm = job.getBatchOpertNm();
            batchProgrm = job.getBatchProgrm();
        }

        String executCycleNm = cycleMap.getOrDefault(entity.getExecutCycle(), entity.getExecutCycle());

        java.util.List<String> dfkNames = entity.getBatchSchdulDfks().stream()
                .map(dfk -> dfkMap.getOrDefault(dfk.getExecutSchdulDfkSe(), dfk.getExecutSchdulDfkSe()))
                .collect(java.util.stream.Collectors.toList());

        String executSchdul = makeExecutSchdul(entity, dfkNames);

        return BatchSchdulDto.from(entity, batchOpertNm, batchProgrm, executCycleNm, executSchdul,
                entity.getBatchSchdulDfks().stream()
                        .map(com.company.project.domain.batch.BatchSchdulDfk::getExecutSchdulDfkSe)
                        .collect(java.util.stream.Collectors.toList()));
    }

    private String makeExecutSchdul(com.company.project.domain.batch.BatchSchdul entity,
            java.util.List<String> dfkNames) {
        StringBuilder sb = new StringBuilder();
        String cycle = entity.getExecutCycle();
        String de = entity.getExecutSchdulDe();

        if ("03".equals(cycle)) { // 매월
            if (de != null && de.length() >= 8)
                sb.append(de.substring(6, 8)).append("일 ");
        } else if ("04".equals(cycle)) { // 매년
            if (de != null && de.length() >= 8)
                sb.append(de.substring(4, 6)).append("-").append(de.substring(6, 8)).append(" ");
        } else if (!"01".equals(cycle) && !"02".equals(cycle)) { // Once or other
            if (de != null && de.length() >= 8)
                sb.append(de.substring(0, 4)).append("-").append(de.substring(4, 6)).append("-")
                        .append(de.substring(6, 8)).append(" ");
        }

        if ("02".equals(cycle)) { // 매주
            if (!dfkNames.isEmpty()) {
                sb.append(String.join(",", dfkNames)).append(" ");
            }
        }

        sb.append(entity.getExecutSchdulHour()).append(":").append(entity.getExecutSchdulMnt()).append(":")
                .append(entity.getExecutSchdulSecnd());
        return sb.toString();
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

        if (dto.getExecutSchdulDfkSes() != null) {
            for (String dfkSe : dto.getExecutSchdulDfkSes()) {
                batchSchdul.getBatchSchdulDfks().add(com.company.project.domain.batch.BatchSchdulDfk.builder()
                        .batchSchdulId(batchSchdulId)
                        .executSchdulDfkSe(dfkSe)
                        .build());
            }
        }

        batchSchdulRepository.save(batchSchdul);
        return batchSchdulId;
    }

    @Override
    @Transactional
    public void updateBatchSchdul(String batchSchdulId, String userId, BatchSchdulDto dto) {
        com.company.project.domain.batch.BatchSchdul batchSchdul = batchSchdulRepository.findById(batchSchdulId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // Use a more robust update logic
        // For simplicity, we create a new entity but keep the IDs and creator info
        // In a real project, we'd use setter or a domain method.

        com.company.project.domain.batch.BatchSchdul updated = com.company.project.domain.batch.BatchSchdul.builder()
                .batchSchdulId(batchSchdulId)
                .batchOpertId(dto.getBatchOpertId())
                .executCycle(dto.getExecutCycle())
                .executSchdulDe(dto.getExecutSchdulDe())
                .executSchdulHour(dto.getExecutSchdulHour())
                .executSchdulMnt(dto.getExecutSchdulMnt())
                .executSchdulSecnd(dto.getExecutSchdulSecnd())
                .frstRegisterId(batchSchdul.getFrstRegisterId())
                .build();

        if (dto.getExecutSchdulDfkSes() != null) {
            for (String dfkSe : dto.getExecutSchdulDfkSes()) {
                updated.getBatchSchdulDfks().add(com.company.project.domain.batch.BatchSchdulDfk.builder()
                        .batchSchdulId(batchSchdulId)
                        .executSchdulDfkSe(dfkSe)
                        .build());
            }
        }

        batchSchdulRepository.save(updated);
    }

    @Override
    @Transactional
    public void deleteBatchSchdul(String batchSchdulId) {
        com.company.project.domain.batch.BatchSchdul batchSchdul = batchSchdulRepository.findById(batchSchdulId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        batchSchdulRepository.delete(batchSchdul);
    }
}
