package com.company.project.service.recomendsite;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.recomendsite.RecomendSite;
import com.company.project.domain.recomendsite.RecomendSiteRepository;
import com.company.project.service.recomendsite.dto.RecomendSiteDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 추천사이트정보 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecomendSiteService implements EgovRecomendSiteService {

    private final RecomendSiteRepository recomendSiteRepository;

    @Override
    public Page<RecomendSiteDto> getRecomendSiteList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return recomendSiteRepository.findAll(pageable).map(RecomendSiteDto::from);
        }
        return recomendSiteRepository.findByRecomendSiteNmContaining(keyword, pageable).map(RecomendSiteDto::from);
    }

    @Override
    public RecomendSiteDto getRecomendSite(String recomendSiteId) {
        return recomendSiteRepository.findById(recomendSiteId)
                .map(RecomendSiteDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createRecomendSite(String userId, RecomendSiteDto dto) {
        String recomendSiteId = "RECD_" + String.format("%015d", System.currentTimeMillis());
        RecomendSite recomendSite = RecomendSite.builder()
                .recomendSiteId(recomendSiteId)
                .recomendSiteUrl(dto.getRecomendSiteUrl())
                .recomendSiteNm(dto.getRecomendSiteNm())
                .recomendSiteDc(dto.getRecomendSiteDc())
                .recomendResnCn(dto.getRecomendResnCn())
                .recomendConfmAt(dto.getRecomendConfmAt())
                .confmDe(dto.getConfmDe())
                .frstRegisterId(userId)
                .build();
        recomendSiteRepository.save(recomendSite);
        return recomendSiteId;
    }

    @Override
    @Transactional
    public void updateRecomendSite(String recomendSiteId, String userId, RecomendSiteDto dto) {
        RecomendSite recomendSite = recomendSiteRepository.findById(recomendSiteId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        recomendSite.update(dto.getRecomendSiteUrl(), dto.getRecomendSiteNm(), dto.getRecomendSiteDc(),
                dto.getRecomendResnCn(), dto.getRecomendConfmAt(), dto.getConfmDe(), userId);
    }

    @Override
    @Transactional
    public void deleteRecomendSite(String recomendSiteId) {
        recomendSiteRepository.deleteById(recomendSiteId);
    }
}
