package com.company.project.service.batch;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.batch.BatchOpert;
import com.company.project.domain.batch.BatchOpertRepository;
import com.company.project.domain.batch.BatchResult;
import com.company.project.domain.batch.BatchResultRepository;
import com.company.project.service.batch.dto.BatchResultDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

/**
 * 諛곗?寃곌낵 ??퉬???ы쁽?
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BatchResultService implements EgovBatchResultService {

    private final BatchResultRepository batchResultRepository;
    private final BatchOpertRepository batchOpertRepository;

    @Override
    public Page<BatchResultDto> getBatchResultList(String sttus, String searchKeywordFrom, String searchKeywordTo,
            String searchCondition, String searchKeyword, Pageable pageable) {
        return batchResultRepository
                .searchBatchResults(sttus, searchKeywordFrom, searchKeywordTo, searchCondition, searchKeyword,
                        Objects.requireNonNull(pageable))
                .map(entity -> {
                    String batchOpertNm = "";
                    String batchProgrm = "";
                    if (entity.getBatchOpertId() != null) {
                        BatchOpert opert = batchOpertRepository
                                .findById(Objects.requireNonNull(entity.getBatchOpertId())).orElse(null);
                        if (opert != null) {
                            batchOpertNm = opert.getBatchOpertNm();
                            batchProgrm = opert.getBatchProgrm();
                        }
                    }
                    return BatchResultDto.from(entity, batchOpertNm, batchProgrm, entity.getSttus());
                });
    }

    @Override
    public BatchResultDto getBatchResult(String batchResultId) {
        BatchResult entity = batchResultRepository.findById(Objects.requireNonNull(batchResultId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        String batchOpertNm = "";
        String batchProgrm = "";
        if (entity.getBatchOpertId() != null) {
            BatchOpert opert = batchOpertRepository.findById(Objects.requireNonNull(entity.getBatchOpertId()))
                    .orElse(null);
            if (opert != null) {
                batchOpertNm = opert.getBatchOpertNm();
                batchProgrm = opert.getBatchProgrm();
            }
        }

        return BatchResultDto.from(entity, batchOpertNm, batchProgrm, entity.getSttus());
    }

    @Override
    @Transactional
    public void deleteBatchResult(String batchResultId) {
        batchResultRepository.deleteById(Objects.requireNonNull(batchResultId));
    }
}
