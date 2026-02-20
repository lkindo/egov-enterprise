package com.company.project.service.rsm;

import com.company.project.service.rsm.dto.RecentSrchwrdDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovRecentSrchwrdService {
    // 愿由??ㅼ젙
    Page<RecentSrchwrdDto> getRecentSrchwrdManageList(String keyword, Pageable pageable);
    RecentSrchwrdDto getRecentSrchwrdManage(String manageId);
    void insertRecentSrchwrdManage(RecentSrchwrdDto dto);
    void updateRecentSrchwrdManage(RecentSrchwrdDto dto);
    void deleteRecentSrchwrdManage(String manageId);

    // 寃?됱뼱 ?대젰
    Page<RecentSrchwrdDto> getRecentSrchwrdList(String manageId, Pageable pageable);
    void insertRecentSrchwrd(String manageId, String srchwrdNm);
    void deleteRecentSrchwrd(String srchwrdId);
}
