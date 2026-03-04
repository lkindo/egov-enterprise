package com.company.project.service.rss;

import com.company.project.service.rss.dto.RssDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RssService {
        Page<RssDto> getRssList(String keyword, Pageable pageable);

        RssDto getRss(String rssId);

        void registerRss(RssDto dto);

        void updateRss(RssDto dto);

        void deleteRss(String rssId);
}
