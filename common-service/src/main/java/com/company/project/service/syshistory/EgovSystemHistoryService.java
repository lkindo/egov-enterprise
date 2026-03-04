package com.company.project.service.syshistory;

import com.company.project.service.syshistory.dto.SystemHistoryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ??뒪????????퉬???명꽣??씠??
 */
public interface EgovSystemHistoryService {

    /**
     * ??뒪??????紐⑸?議고??     */
    Page<SystemHistoryDto> getSystemHistoryList(String keyword, Pageable pageable);

    /**
     * ??뒪???????곸꽭 議고??     */
    SystemHistoryDto getSystemHistory(String histId);

    /**
     * ??뒪???????깅줉
     */
    String createSystemHistory(String userId, SystemHistoryDto dto);

    /**
     * ??뒪????????젙
     */
    void updateSystemHistory(String histId, String userId, SystemHistoryDto dto);

    /**
     * ??뒪??????????     */
    void deleteSystemHistory(String histId, String userId);
}