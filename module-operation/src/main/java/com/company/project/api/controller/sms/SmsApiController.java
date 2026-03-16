package com.company.project.api.controller.sms;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.security.annotation.LoginUser;
import com.company.project.security.service.CustomUserDetails;
import com.company.project.service.sms.EgovSmsService;
import com.company.project.service.sms.dto.SmsDto;
import com.company.project.service.sms.dto.SmsRecptnDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 문자 메시지(SMS) 관리를 위한 API 컨트롤러 (Admin)
 */
@Tag(name = "SMS Management", description = "문자 메시지 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/operation/sms")
@RequiredArgsConstructor
public class SmsApiController {

    private final EgovSmsService smsService;

    @Operation(summary = "SMS 발송 내역 조회", description = "발송된 SMS 목록을 페이징 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SmsDto>>> getSmsList(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<SmsDto> result = smsService.getSmsList(searchCondition, searchKeyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "SMS 상세 조회", description = "특정 SMS의 발송 상세 정보를 조회합니다.")
    @GetMapping("/{smsId}")
    public ResponseEntity<ApiResponse<SmsDto>> getSms(
            @Parameter(description = "SMS ID") @PathVariable String smsId) {
        return ResponseEntity.ok(ApiResponse.success(smsService.getSms(smsId)));
    }

    @Operation(summary = "SMS 수신자 목록 조회", description = "특정 SMS의 수신자 목록을 조회합니다.")
    @GetMapping("/{smsId}/recipients")
    public ResponseEntity<ApiResponse<List<SmsRecptnDto>>> getSmsRecipients(
            @Parameter(description = "SMS ID") @PathVariable String smsId) {
        return ResponseEntity.ok(ApiResponse.success(smsService.getSmsRecipients(smsId)));
    }

    @Operation(summary = "SMS 발송", description = "새로운 SMS를 발송합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> sendSms(
            @LoginUser CustomUserDetails userDetails,
            @RequestBody SmsDto smsDto) {
        String smsId = smsService.sendSms(userDetails.getEsntlId(), smsDto);
        return ResponseEntity.ok(ApiResponse.success(smsId));
    }
}
