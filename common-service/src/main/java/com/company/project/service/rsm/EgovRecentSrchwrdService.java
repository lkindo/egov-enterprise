package com.company.project.service.rsm;

import com.company.project.service.rsm.dto.RecentSrchwrdDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovRecentSrchwrdService {
    // 최근검색어 관리(마스터)
    RecentSrchwrdDto getRecentSrchwrdManage(String manageId);

    void registerRecentSrchwrdManage(RecentSrchwrdDto dto);

    void updateRecentSrchwrdManage(RecentSrchwrdDto dto);

    void deleteRecentSrchwrdManage(String manageId);

    Page<RecentSrchwrdDto> getRecentSrchwrdManageList(String searchKeyword, Pageable pageable);

    // 최근검색어 결과(내역)
    void registerRecentSrchwrd(RecentSrchwrdDto dto);

    void deleteRecentSrchwrd(String srchwrdId);

    Page<RecentSrchwrdDto> getRecentSrchwrdList(String manageId, String searchKeyword, Pageable pageable);
}
