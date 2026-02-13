package com.company.project.api.controller.log;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.syshistory.SystemHistory;
import com.company.project.domain.syshistory.SystemHistoryRepository;
import com.company.project.service.syshistory.dto.SystemHistoryDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Admin Audit", description = "관리자 감사 로그 API")
@RestController
@RequestMapping("/api/v1/admin/audit")
@RequiredArgsConstructor
public class AdminAuditController {

    private final SystemHistoryRepository systemHistoryRepository;

    @Operation(summary = "시스템 이력(Audit) 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<SystemHistoryDto>>> getAuditLogs(
            @RequestParam(required = false) String keyword,
            @PageableDefault(sort = "frstRegisterPnttm", direction = Sort.Direction.DESC) Pageable pageable) {
        
        Page<SystemHistory> page;
        if (keyword != null && !keyword.isEmpty()) {
            page = systemHistoryRepository.searchByKeyword(keyword, pageable);
        } else {
            page = systemHistoryRepository.findAll(pageable);
        }

        return ResponseEntity.ok(ApiResponse.success(page.map(SystemHistoryDto::from)));
    }
}
