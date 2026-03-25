package com.company.project.business.service.scrap;

import com.company.project.business.service.scrap.dto.ScrapDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ??겕????퉬???명꽣??씠??
 */
public interface EgovScrapService {

    Page<ScrapDto> getMyScrapList(String userId, Pageable pageable);

    ScrapDto getScrap(String scrapId);

    String createScrap(String userId, ScrapDto dto);

    void updateScrap(String scrapId, String userId, ScrapDto dto);

    void deleteScrap(String scrapId);
}
