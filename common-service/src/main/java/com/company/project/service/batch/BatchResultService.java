package com.company.project.service.batch;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
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
    private final com.company.project.domain.batch.BatchJobRepository batchJobRepository;
    private final com.company.project.service.code.EgovCommonCodeService commonCodeService;

    @Override
    public Page<BatchResultDto> getBatchResultList(String sttus, String searchKeywordFrom, String searchKeywordTo,
            String searchCondition, String searchKeyword, Pageable pageable) {
        Page<com.company.project.domain.batch.BatchResult> entities = batchResultRepository.searchBatchResults(sttus,
                searchKeywordFrom, searchKeywordTo, searchCondition, searchKeyword, pageable);

        // Get common codes for status names
        java.util.List<com.company.project.service.code.dto.CommonCodeDto> statusCodes = commonCodeService
                .getCodesByGroup("COM076");
        java.util.Map<String, String> statusMap = statusCodes.stream()
                .collect(java.util.stream.Collectors.toMap(com.company.project.service.code.dto.CommonCodeDto::getCode,
                        com.company.project.service.code.dto.CommonCodeDto::getCodeNm, (a, b) -> a));

        // Optimizing N+1 issue: Fetch all related BatchJobs in one query
        java.util.Set<String> batchOpertIds = entities.getContent().stream()
                .map(com.company.project.domain.batch.BatchResult::getBatchOpertId)
                .collect(java.util.stream.Collectors.toSet());

        java.util.Map<String, com.company.project.domain.batch.BatchJob> jobMap = new java.util.HashMap<>();
        if (!batchOpertIds.isEmpty()) {
            java.util.List<com.company.project.domain.batch.BatchJob> jobs = batchJobRepository.findAllById(batchOpertIds);
            jobMap = jobs.stream()
                    .collect(java.util.stream.Collectors.toMap(com.company.project.domain.batch.BatchJob::getBatchOpertId, java.util.function.Function.identity()));
        }

        final java.util.Map<String, com.company.project.domain.batch.BatchJob> finalJobMap = jobMap;

        return entities.map(entity -> {
            String batchOpertNm = "";
            String batchProgrm = "";
            com.company.project.domain.batch.BatchJob job = finalJobMap.get(entity.getBatchOpertId());
            if (job != null) {
                batchOpertNm = job.getBatchOpertNm();
                batchProgrm = job.getBatchProgrm();
            }
            String sttusNm = statusMap.getOrDefault(entity.getSttus(), entity.getSttus());
            return BatchResultDto.from(entity, batchOpertNm, batchProgrm, sttusNm);
        });
    }

    @Override
    public BatchResultDto getBatchResult(String batchResultId) {
        com.company.project.domain.batch.BatchResult entity = batchResultRepository.findById(batchResultId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        String batchOpertNm = "";
        String batchProgrm = "";
        com.company.project.domain.batch.BatchJob job = batchJobRepository.findById(entity.getBatchOpertId())
                .orElse(null);
        if (job != null) {
            batchOpertNm = job.getBatchOpertNm();
            batchProgrm = job.getBatchProgrm();
        }

        java.util.List<com.company.project.service.code.dto.CommonCodeDto> statusCodes = commonCodeService
                .getCodesByGroup("COM076");
        String sttusNm = statusCodes.stream()
                .filter(c -> c.getCode().equals(entity.getSttus()))
                .map(com.company.project.service.code.dto.CommonCodeDto::getCodeNm)
                .findFirst().orElse(entity.getSttus());

        return BatchResultDto.from(entity, batchOpertNm, batchProgrm, sttusNm);
    }

    @Override
    @Transactional
    public void deleteBatchResult(String batchResultId) {
        com.company.project.domain.batch.BatchResult batchResult = batchResultRepository.findById(batchResultId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        batchResultRepository.delete(batchResult);
    }
}
