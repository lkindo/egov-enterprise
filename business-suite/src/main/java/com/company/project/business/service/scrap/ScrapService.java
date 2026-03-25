package com.company.project.business.service.scrap;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.business.domain.scrap.Scrap;
import com.company.project.business.domain.scrap.ScrapRepository;
import com.company.project.business.service.scrap.dto.ScrapDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

/**
 * 스크랩 서비스 구현 클래스
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
        // ID 생성 규칙 단순화
        String scrapId = "SCRP_" + System.currentTimeMillis();

        Scrap scrap = Scrap.builder()
                .scrapId(scrapId)
                .bbsId(dto.getBbsId())
                .nttId(dto.getNttId())
                .scrapNm(dto.getScrapNm())
                .useAt("Y")
                .build();

        scrapRepository.save(Objects.requireNonNull(scrap));
        return scrapId;
    }

    @Override
    @Transactional
    public void updateScrap(String scrapId, String userId, ScrapDto dto) {
        Scrap scrap = scrapRepository.findById(Objects.requireNonNull(scrapId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        scrap.update(dto.getScrapNm(), dto.getUseAt());
    }

    @Override
    @Transactional
    public void deleteScrap(String scrapId) {
        Scrap scrap = scrapRepository.findById(Objects.requireNonNull(scrapId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        scrapRepository.delete(Objects.requireNonNull(scrap));
    }
}
