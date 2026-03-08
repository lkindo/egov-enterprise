package com.company.project.service.rss;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.rss.Rss;
import com.company.project.domain.rss.RssRepository;
import com.company.project.service.rss.dto.RssDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RssServiceImpl implements RssService {

    private final RssRepository rssRepository;

    @Override
    public Page<RssDto> getRssList(String keyword, Pageable pageable) {
        return rssRepository.findAll(Objects.requireNonNull(pageable))
                .map(RssDto::from);
    }

    @Override
    public RssDto getRss(String rssId) {
        Rss entity = rssRepository.findById(Objects.requireNonNull(rssId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return RssDto.from(entity);
    }

    @Override
    @Transactional
    public void registerRss(RssDto dto) {
        Rss entity = Rss.builder()
                .rssId(dto.getRssId())
                .trgetSvcNm(dto.getTrgetSvcNm())
                .trgetSvcTable(dto.getTrgetSvcTable())
                .trgetSvcListCo(dto.getTrgetSvcListCo())
                .hderTitle(dto.getHderTitle())
                .hderLink(dto.getHderLink())
                .hderDc(dto.getHderDc())
                .hderTag(dto.getHderTag())
                .hderEtc(dto.getHderEtc())
                .bdtTitle(dto.getBdtTitle())
                .bdtLink(dto.getBdtLink())
                .bdtDc(dto.getBdtDc())
                .bdtTag(dto.getBdtTag())
                .bdtEtcTag(dto.getBdtEtcTag())
                .build();
        rssRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateRss(RssDto dto) {
        Rss entity = rssRepository.findById(Objects.requireNonNull(dto.getRssId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(
                dto.getTrgetSvcNm(),
                dto.getTrgetSvcTable(),
                dto.getTrgetSvcListCo(),
                dto.getHderTitle(),
                dto.getHderLink(),
                dto.getHderDc(),
                dto.getHderTag(),
                dto.getHderEtc(),
                dto.getBdtTitle(),
                dto.getBdtLink(),
                dto.getBdtDc(),
                dto.getBdtTag(),
                dto.getBdtEtcTag());
    }

    @Override
    @Transactional
    public void deleteRss(String rssId) {
        rssRepository.deleteById(Objects.requireNonNull(rssId));
    }
}
