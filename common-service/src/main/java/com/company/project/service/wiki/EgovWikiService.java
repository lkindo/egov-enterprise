package com.company.project.service.wiki;

import com.company.project.service.wiki.dto.WikiBookmarkDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovWikiService {
    void registerBookmark(WikiBookmarkDto dto);

    void deleteBookmark(String wikiBkmkId);

    Page<WikiBookmarkDto> getBookmarkList(String userId, Pageable pageable);

    boolean isDuplicated(String userId, String wikiBkmkNm);
}
