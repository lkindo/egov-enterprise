package com.company.project.service.wiki;

import com.company.project.service.wiki.dto.WikiBookmarkDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovWikiBookmarkService {
    Page<WikiBookmarkDto> getWikiBookmarkList(String userId, String keyword, Pageable pageable);
    void insertWikiBookmark(String userId, String wikiBkmkNm);
    void deleteWikiBookmark(String wikiBkmkId);
    boolean checkDuplication(String userId, String wikiBkmkNm);
}