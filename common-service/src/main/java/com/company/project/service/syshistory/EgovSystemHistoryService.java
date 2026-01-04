package com.company.project.service.syshistory;

import com.company.project.service.syshistory.dto.SystemHistoryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 시스템 이력 서비스 인터페이스
 */
public interface EgovSystemHistoryService {

    /**
     * 시스템 이력 목록 조회
     */
    Page<SystemHistoryDto> getSystemHistoryList(String keyword, Pageable pageable);

    /**
     * 시스템 이력 상세 조회
     */
    SystemHistoryDto getSystemHistory(String histId);

    /**
     * 시스템 이력 등록
     */
    String createSystemHistory(String userId, SystemHistoryDto dto);

    /**
     * 시스템 이력 수정
     */
    void updateSystemHistory(String histId, String userId, SystemHistoryDto dto);

    /**
     * 시스템 이력 삭제
     */
    void deleteSystemHistory(String histId, String userId);
}
