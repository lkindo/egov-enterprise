package com.company.project.service.scrap;

import com.company.project.service.scrap.dto.ScrapDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ??½ê²•????•í‰¬???ëª…ê½£??ì” ??
 */
public interface EgovScrapService {

    Page<ScrapDto> getMyScrapList(String userId, Pageable pageable);

    ScrapDto getScrap(String scrapId);

    String createScrap(String userId, ScrapDto dto);

    void updateScrap(String scrapId, String userId, ScrapDto dto);

    void deleteScrap(String scrapId);
}
