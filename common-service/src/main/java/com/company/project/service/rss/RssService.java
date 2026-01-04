package com.company.project.service.rss;

import com.company.project.domain.rss.Rss;
import com.company.project.domain.rss.RssRepository;
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

    @Override
    public RssDto getRss(String rssId) {
        return rssRepository.findById(rssId)
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void registerRss(RssDto dto) {
        Rss rss = Rss.builder()
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
                .frstRegisterId("SYSTEM")
                .lastUpdusrId("SYSTEM")
                .build();
        rssRepository.save(rss);
    }

    @Override
    @Transactional
    public void updateRss(RssDto dto) {
        rssRepository.findById(dto.getRssId())
                .ifPresent(r -> {
                    // Rss 엔티티에 update 메소드 추가 필요 시 반영
                });
    }

    @Override
    @Transactional
    public void deleteRss(String rssId) {
        rssRepository.deleteById(rssId);
    }

    @Override
    public Page<RssDto> getRssList(String searchKeyword, Pageable pageable) {
        return rssRepository.findAll(pageable)
                .map(this::convertToDto);
    }

    private RssDto convertToDto(Rss r) {
        return RssDto.builder()
                .rssId(r.getRssId())
                .trgetSvcNm(r.getTrgetSvcNm())
                .trgetSvcTable(r.getTrgetSvcTable())
                .trgetSvcListCo(r.getTrgetSvcListCo())
                .hderTitle(r.getHderTitle())
                .hderLink(r.getHderLink())
                .hderDc(r.getHderDc())
                .hderTag(r.getHderTag())
                .hderEtc(r.getHderEtc())
                .bdtTitle(r.getBdtTitle())
                .bdtLink(r.getBdtLink())
                .bdtDc(r.getBdtDc())
                .bdtTag(r.getBdtTag())
                .bdtEtcTag(r.getBdtEtcTag())
                .build();
    }
}
