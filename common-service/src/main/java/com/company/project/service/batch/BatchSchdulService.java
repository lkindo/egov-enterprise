package com.company.project.service.batch;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.batch.BatchJob;
import com.company.project.domain.batch.BatchJobRepository;
import com.company.project.domain.batch.BatchSchdul;
import com.company.project.domain.batch.BatchSchdulDfk;
import com.company.project.domain.batch.BatchSchdulRepository;
import com.company.project.service.batch.dto.BatchSchdulDto;
import com.company.project.service.code.EgovCommonCodeService;
import com.company.project.service.code.dto.CommonCodeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 배치스케줄 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BatchSchdulService implements EgovBatchSchdulService {

    private final BatchSchdulRepository batchSchdulRepository;
    private final BatchJobRepository batchJobRepository;
    private final EgovCommonCodeService commonCodeService;

    private final java.util.concurrent.ConcurrentHashMap<String, Map<String, String>> codeMapCache = new java.util.concurrent.ConcurrentHashMap<>();

    @Override
    public Page<BatchSchdulDto> getBatchSchdulList(String searchCondition, String searchKeyword, Pageable pageable) {
        Page<BatchSchdul> entities = batchSchdulRepository
                .searchBatchSchduls(searchCondition, searchKeyword, pageable);

        // Get common codes for cycle names and day of week names
        Map<String, String> cycleMap = getCodeMap("COM047");
        Map<String, String> dfkMap = getCodeMap("COM074");

        // Collect BatchJob IDs to prevent N+1 queries
        Set<String> batchOpertIds = entities.stream()
                .map(BatchSchdul::getBatchOpertId)
                .filter(id -> id != null && !id.isEmpty())
                .collect(Collectors.toSet());

        Map<String, BatchJob> jobMap = batchJobRepository
                .findAllById(batchOpertIds).stream()
                .collect(Collectors.toMap(
                        BatchJob::getBatchOpertId,
                        job -> job,
                        (existing, replacement) -> existing));

        return entities.map(entity -> convertToDto(entity, cycleMap, dfkMap, jobMap));
    }

    @Override
    public BatchSchdulDto getBatchSchdul(String batchSchdulId) {
        BatchSchdul entity = batchSchdulRepository.findById(batchSchdulId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        Map<String, String> cycleMap = getCodeMap("COM047");
        Map<String, String> dfkMap = getCodeMap("COM074");

        Map<String, BatchJob> jobMap = new HashMap<>();
        if (entity.getBatchOpertId() != null) {
            batchJobRepository.findById(entity.getBatchOpertId())
                    .ifPresent(job -> jobMap.put(job.getBatchOpertId(), job));
        }

        return convertToDto(entity, cycleMap, dfkMap, jobMap);
    }

    private Map<String, String> getCodeMap(String codeGroupId) {
        return codeMapCache.computeIfAbsent(codeGroupId, key -> commonCodeService.getCodesByGroup(key).stream()
                .collect(Collectors.toMap(CommonCodeDto::getCode,
                        CommonCodeDto::getCodeNm, (a, b) -> a)));
    }

    private BatchSchdulDto convertToDto(BatchSchdul entity,
            Map<String, String> cycleMap, Map<String, String> dfkMap,
            Map<String, BatchJob> jobMap) {
        String batchOpertNm = "";
        String batchProgrm = "";
        BatchJob job = jobMap.get(entity.getBatchOpertId());
        if (job != null) {
            batchOpertNm = job.getBatchOpertNm();
            batchProgrm = job.getBatchProgrm();
        }

        String executCycleNm = cycleMap.getOrDefault(entity.getExecutCycle(), entity.getExecutCycle());

        List<String> dfkNames = entity.getBatchSchdulDfks().stream()
                .map(dfk -> dfkMap.getOrDefault(dfk.getExecutSchdulDfkSe(), dfk.getExecutSchdulDfkSe()))
                .collect(Collectors.toList());

        String executSchdul = makeExecutSchdul(entity, dfkNames);

        return BatchSchdulDto.from(entity, batchOpertNm, batchProgrm, executCycleNm, executSchdul,
                entity.getBatchSchdulDfks().stream()
                        .map(BatchSchdulDfk::getExecutSchdulDfkSe)
                        .collect(Collectors.toList()));
    }

    private String makeExecutSchdul(BatchSchdul entity,
            List<String> dfkNames) {
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
                batchSchdul.getBatchSchdulDfks().add(BatchSchdulDfk.builder()
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
        BatchSchdul batchSchdul = batchSchdulRepository.findById(batchSchdulId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // Use a more robust update logic
        // For simplicity, we create a new entity but keep the IDs and creator info
        // In a real project, we'd use setter or a domain method.

        BatchSchdul updated = BatchSchdul.builder()
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
                updated.getBatchSchdulDfks().add(BatchSchdulDfk.builder()
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
        BatchSchdul batchSchdul = batchSchdulRepository.findById(batchSchdulId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        batchSchdulRepository.delete(batchSchdul);
    }
}
