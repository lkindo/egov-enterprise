package com.company.project.service.recentsearchword;

import com.company.project.service.recentsearchword.dto.RecentSearchwordDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RecentSearchwordService {
    // 검색어 관리
    Page<RecentSearchwordDto> getRecentSearchwordManageList(String keyword, Pageable pageable);

    RecentSearchwordDto getRecentSearchwordManage(String manageId);

    void insertRecentSearchwordManage(RecentSearchwordDto dto);

    void updateRecentSearchwordManage(RecentSearchwordDto dto);

    void deleteRecentSearchwordManage(String manageId);

    // 검색어 목록
    Page<RecentSearchwordDto> getRecentSearchwordList(String manageId, Pageable pageable);

    void insertRecentSearchword(String manageId, String searchwordNm);

    void deleteRecentSearchword(String searchwordId);
}