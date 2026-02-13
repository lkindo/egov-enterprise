package com.company.project.service.batch;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.batch.BatchOpert;
import com.company.project.domain.batch.BatchOpertRepository;
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
    private final BatchOpertRepository batchOpertRepository;
    private final EgovCommonCodeService commonCodeService;

    private final java.util.concurrent.ConcurrentHashMap<String, Map<String, String>> codeMapCache = new java.util.concurrent.ConcurrentHashMap<>();

    @Override
    public Page<BatchSchdulDto> getBatchSchdulList(String searchCondition, String searchKeyword, Pageable pageable) {
        Page<BatchSchdul> entities = batchSchdulRepository
                .searchBatchSchduls(searchCondition, searchKeyword, pageable);

        Map<String, String> cycleMap = getCodeMap("COM047");
        Map<String, String> dfkMap = getCodeMap("COM074");

        Set<String> batchOpertIds = entities.stream()
                .map(BatchSchdul::getBatchOpertId)
                .filter(id -> id != null && !id.isEmpty())
                .collect(Collectors.toSet());

        Map<String, BatchOpert> jobMap = batchOpertRepository
                .findAllById(batchOpertIds).stream()
                .collect(Collectors.toMap(
                        BatchOpert::getBatchOpertId,
                        job -> job,
                        (existing, replacement) -> existing));

        Set<String> batchSchdulIds = entities.stream()
                .map(BatchSchdul::getBatchSchdulId)
                .collect(Collectors.toSet());

        Map<String, List<BatchSchdulDfk>> dfkMapBySchdulId;
        if (batchSchdulIds.isEmpty()) {
            dfkMapBySchdulId = new HashMap<>();
        } else {
            dfkMapBySchdulId = batchSchdulRepository
                    .findAllDfksByBatchSchdulIdIn(batchSchdulIds).stream()
                    .collect(Collectors.groupingBy(BatchSchdulDfk::getBatchSchdulId));
        }

        return entities.map(entity -> convertToDto(entity, cycleMap, dfkMap, jobMap, dfkMapBySchdulId));
    }

    @Override
    public BatchSchdulDto getBatchSchdul(String batchSchdulId) {
        BatchSchdul entity = batchSchdulRepository.findById(batchSchdulId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        Map<String, String> cycleMap = getCodeMap("COM047");
        Map<String, String> dfkMap = getCodeMap("COM074");

        Map<String, BatchOpert> jobMap = new HashMap<>();
        if (entity.getBatchOpertId() != null) {
            batchOpertRepository.findById(entity.getBatchOpertId())
                    .ifPresent(job -> jobMap.put(job.getBatchOpertId(), job));
        }

        return convertToDto(entity, cycleMap, dfkMap, jobMap, null);
    }

    private Map<String, String> getCodeMap(String codeGroupId) {
        return codeMapCache.computeIfAbsent(codeGroupId, key -> commonCodeService.getCodesByGroup(key).stream()
                .collect(Collectors.toMap(CommonCodeDto::code,
                        CommonCodeDto::codeNm, (a, b) -> a)));
    }

    private BatchSchdulDto convertToDto(BatchSchdul entity,
            Map<String, String> cycleMap, Map<String, String> dfkMap,
            Map<String, BatchOpert> jobMap, Map<String, List<BatchSchdulDfk>> dfkMapBySchdulId) {
        String batchOpertNm = "";
        String batchProgrm = "";
        BatchOpert job = jobMap.get(entity.getBatchOpertId());
        if (job != null) {
            batchOpertNm = job.getBatchOpertNm();
            batchProgrm = job.getBatchProgrm();
        }

        String executCycleNm = cycleMap.getOrDefault(entity.getExecutCycle(), entity.getExecutCycle());

        List<BatchSchdulDfk> dfks;
        if (dfkMapBySchdulId != null && dfkMapBySchdulId.containsKey(entity.getBatchSchdulId())) {
            dfks = dfkMapBySchdulId.get(entity.getBatchSchdulId());
        } else if (dfkMapBySchdulId != null) {
            dfks = java.util.Collections.emptyList();
        } else {
            dfks = entity.getBatchSchdulDfks();
        }

        List<String> dfkNames = dfks.stream()
                .map(dfk -> dfkMap.getOrDefault(dfk.getExecutSchdulDfkSe(), dfk.getExecutSchdulDfkSe()))
                .collect(Collectors.toList());

        String executSchdul = makeExecutSchdul(entity, dfkNames);

        return BatchSchdulDto.from(entity, batchOpertNm, batchProgrm, executCycleNm, executSchdul,
                dfks.stream()
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
                .batchOpert(batchOpertRepository.getReferenceById(dto.getBatchOpertId()))
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
                        .batchSchdul(batchSchdul)
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

        batchSchdul.setBatchOpert(batchOpertRepository.getReferenceById(dto.getBatchOpertId()));
        batchSchdul.setExecutCycle(dto.getExecutCycle());
        batchSchdul.setExecutSchdulDe(dto.getExecutSchdulDe());
        batchSchdul.setExecutSchdulHour(dto.getExecutSchdulHour());
        batchSchdul.setExecutSchdulMnt(dto.getExecutSchdulMnt());
        batchSchdul.setExecutSchdulSecnd(dto.getExecutSchdulSecnd());
        batchSchdul.setLastUpdusrId(userId);

        if (dto.getExecutSchdulDfkSes() != null) {
            batchSchdul.getBatchSchdulDfks().clear();
            for (String dfkSe : dto.getExecutSchdulDfkSes()) {
                batchSchdul.getBatchSchdulDfks().add(BatchSchdulDfk.builder()
                        .batchSchdulId(batchSchdulId)
                        .batchSchdul(batchSchdul)
                        .executSchdulDfkSe(dfkSe)
                        .build());
            }
        }

        batchSchdulRepository.save(batchSchdul);
    }

    @Override
    @Transactional
    public void deleteBatchSchdul(String batchSchdulId) {
        BatchSchdul batchSchdul = batchSchdulRepository.findById(batchSchdulId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        batchSchdulRepository.delete(batchSchdul);
    }
}
