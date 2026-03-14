package com.company.project.api.controller.sms;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.sms.SmsService;
import com.company.project.service.sms.dto.SmsDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 문자 메시지(SMS) 관리를 위한 API 컨트롤러
 */
@Tag(name = "SMS Management", description = "문자 메시지 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/operation/sms")
@RequiredArgsConstructor
public class SmsApiController {

    private final SmsService smsService;

    @Operation(summary = "SMS 발송 내역 조회", description = "발송된 SMS 목록을 페이징 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SmsDto>>> getSmsList(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        
        Page<SmsDto> result = smsService.getSmsList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "SMS 상세 조회", description = "특정 SMS의 발송 상세 정보 및 수신자 목록을 조회합니다.")
    @GetMapping("/{smsId}")
    public ResponseEntity<ApiResponse<SmsDto>> getSms(@PathVariable String smsId) {
        SmsDto dto = smsService.getSms(smsId);
        dto.setRecipients(smsService.getSmsRecipients(smsId));
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @Operation(summary = "SMS 발송", description = "새로운 SMS를 발송합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> sendSms(@RequestBody SmsDto smsDto) {
        // 실제 운영 환경에서는 현재 로그인한 사용자 ID를 전달해야 함 (Spring Security 연동 필요)
        String userId = "ADMIN"; 
        String smsId = smsService.sendSms(userId, smsDto);
        return ResponseEntity.ok(ApiResponse.success(smsId));
    }
}
