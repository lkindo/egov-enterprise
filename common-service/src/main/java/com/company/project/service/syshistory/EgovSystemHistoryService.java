package com.company.project.service.syshistory;

import com.company.project.service.syshistory.dto.SystemHistoryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ??–ë’ª????€????•í‰¬???ëª…ê½£??ì” ??
 */
public interface EgovSystemHistoryService {

    /**
     * ??–ë’ª????€??ï§â‘¸ì¤?è­°ê³ ??     */
    Page<SystemHistoryDto> getSystemHistoryList(String keyword, Pageable pageable);

    /**
     * ??–ë’ª????€???ê³¸ê½­ è­°ê³ ??     */
    SystemHistoryDto getSystemHistory(String histId);

    /**
     * ??–ë’ª????€???ê¹…ì¤‰
     */
    String createSystemHistory(String userId, SystemHistoryDto dto);

    /**
     * ??–ë’ª????€????ì ™
     */
    void updateSystemHistory(String histId, String userId, SystemHistoryDto dto);

    /**
     * ??–ë’ª????€??????     */
    void deleteSystemHistory(String histId, String userId);
}
