package com.company.project.service.syshistory;

import com.company.project.service.syshistory.dto.SystemHistoryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ?쒖뒪???대젰 ?쒕퉬???명꽣?섏씠??
 */
public interface EgovSystemHistoryService {

    /**
     * ?쒖뒪???대젰 紐⑸줉 議고쉶
     */
    Page<SystemHistoryDto> getSystemHistoryList(String keyword, Pageable pageable);

    /**
     * ?쒖뒪???대젰 ?곸꽭 議고쉶
     */
    SystemHistoryDto getSystemHistory(String histId);

    /**
     * ?쒖뒪???대젰 ?깅줉
     */
    String createSystemHistory(String userId, SystemHistoryDto dto);

    /**
     * ?쒖뒪???대젰 ?섏젙
     */
    void updateSystemHistory(String histId, String userId, SystemHistoryDto dto);

    /**
     * ?쒖뒪???대젰 ??젣
     */
    void deleteSystemHistory(String histId, String userId);
}
