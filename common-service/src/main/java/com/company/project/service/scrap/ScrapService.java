package com.company.project.service.scrap;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.scrap.Scrap;
import com.company.project.domain.scrap.ScrapRepository;
import com.company.project.service.scrap.dto.ScrapDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * ??�겕????�퉬???�ы쁽�?
 */
@Service("egovScrapService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScrapService implements EgovScrapService {

    private final ScrapRepository scrapRepository;

    @Override
    public Page<ScrapDto> getMyScrapList(String userId, Pageable pageable) {
        return scrapRepository
                .findByUniqIdAndUseAt(Objects.requireNonNull(userId), "Y", Objects.requireNonNull(pageable))
                .map(ScrapDto::from);
    }

    @Override
    public ScrapDto getScrap(String scrapId) {
        Scrap scrap = scrapRepository.findById(Objects.requireNonNull(scrapId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return ScrapDto.from(scrap);
    }

    @Override
    @Transactional
    public String createScrap(String userId, ScrapDto dto) {
        String scrapId = "SCRP_" + String.format("%013d", System.currentTimeMillis());

        Scrap scrap = Scrap.builder()
                .scrapId(scrapId)
                .bbsId(dto.getBbsId())
                .nttId(dto.getNttId())
                .scrapNm(dto.getScrapNm())
                .useAt("Y")
                .uniqId(userId)
                .frstRegisterId(userId)
                .build();

        scrapRepository.save(Objects.requireNonNull(scrap));
        return scrapId;
    }

    @Override
    @Transactional
    public void updateScrap(String scrapId, String userId, ScrapDto dto) {
        Scrap scrap = scrapRepository.findById(Objects.requireNonNull(scrapId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        scrap.update(dto.getScrapNm(), dto.getUseAt(), userId);
    }

    @Override
    @Transactional
    public void deleteScrap(String scrapId) {
        Scrap scrap = scrapRepository.findById(Objects.requireNonNull(scrapId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        scrapRepository.delete(Objects.requireNonNull(scrap));
    }
}
