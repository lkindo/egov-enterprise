package com.company.project.service.rss;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.rss.Rss;
import com.company.project.domain.rss.RssRepository;
import com.company.project.domain.rss.RssTag;
import com.company.project.domain.rss.RssTagRepository;
import com.company.project.service.rss.dto.RssDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RssService implements EgovRssService {

    private final RssRepository rssRepository;
    private final RssTagRepository rssTagRepository;

    @Override
    public Page<RssDto> getRssList(String keyword, Pageable pageable) {
        return rssTagRepository.findByTrgetSvcNmContaining(keyword, pageable).map(RssDto::from);
    }

    @Override
    public RssDto getRss(String rssId) {
        // Try finding in RssInfo (NRSS) first, then fallback to RssTag (NRSSTAG)
        return rssRepository.findById(rssId)
                .map(RssDto::from)
                .orElseGet(() -> rssTagRepository.findById(rssId)
                        .map(RssDto::from)
                        .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND)));
    }

    @Override
    @Transactional
    public void registerRss(RssDto dto) {
        String id = "RSS_" + String.format("%013d", System.currentTimeMillis());

        // Save to Rss (NRSS)
        Rss rss = Rss.builder()
                .rssId(id)
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
        rssRepository.save(rss);

        // Also save to RssTag (NRSSTAG) for legacy compatibility
        RssTag rssTag = RssTag.builder()
                .rssId(id)
                .trgetSvcNm(dto.getTrgetSvcNm())
                .trgetSvcTable(dto.getTrgetSvcTable())
                .trgetSvcListCo(dto.getTrgetSvcListCo())
                .hderTag(dto.getHderTag())
                .itemTag(dto.getBdtTag())
                .titleTag(dto.getBdtTitle())
                .linkTag(dto.getBdtLink())
                .descriptionTag(dto.getBdtDc())
                .build();
        rssTagRepository.save(rssTag);
    }

    @Override
    @Transactional
    public void updateRss(RssDto dto) {
        Rss rss = rssRepository.findById(dto.getRssId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        rss.update(dto.getTrgetSvcNm(), dto.getTrgetSvcTable(), dto.getTrgetSvcListCo(),
                dto.getHderTitle(), dto.getHderLink(), dto.getHderDc(), dto.getHderTag(), dto.getHderEtc(),
                dto.getBdtTitle(), dto.getBdtLink(), dto.getBdtDc(), dto.getBdtTag(), dto.getBdtEtcTag());

        rssTagRepository.findById(dto.getRssId())
                .ifPresent(tag -> tag.update(dto.getTrgetSvcNm(), dto.getTrgetSvcTable(), dto.getTrgetSvcListCo(),
                        dto.getHderTag(), dto.getBdtTag(), dto.getBdtTitle(), dto.getBdtLink(), dto.getBdtDc()));
    }

    @Override
    @Transactional
    public void deleteRss(String rssId) {
        rssRepository.deleteById(rssId);
        rssTagRepository.deleteById(rssId);
    }
}
