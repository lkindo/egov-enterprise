package com.company.project.api.controller.sms;

import com.company.project.core.response.ApiResponse;
import com.company.project.security.annotation.LoginUser;
import com.company.project.security.service.CustomUserDetails;
import com.company.project.service.sms.EgovSmsService;
import com.company.project.service.sms.dto.SmsDto;
import com.company.project.service.sms.dto.SmsRecptnDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Sms", description = "SMS Management APIs")
@RestController
@RequestMapping("/api/v1/sms")
@RequiredArgsConstructor
public class SmsController {

    private final EgovSmsService smsService;

    @Operation(summary = "SMS 목록 조회")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<SmsDto>>> getSmsList(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(smsService.getSmsList(searchCondition, searchKeyword, pageable)));
    }

    @Operation(summary = "SMS 상세 조회")
    @GetMapping("/{smsId}")
    public ResponseEntity<ApiResponse<SmsDto>> getSms(
            @Parameter(description = "SMS ID") @PathVariable String smsId) {
        return ResponseEntity.ok(ApiResponse.success(smsService.getSms(smsId)));
    }

    @Operation(summary = "SMS 발송")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> sendSms(
            @LoginUser CustomUserDetails userDetails,
            @RequestBody SmsDto smsDto) {
        String smsId = smsService.sendSms(userDetails.getEsntlId(), smsDto);
        return ResponseEntity.ok(ApiResponse.success(smsId));
    }

    @Operation(summary = "SMS 수신자 목록 조회")
    @GetMapping("/{smsId}/recipients")
    public ResponseEntity<ApiResponse<List<SmsRecptnDto>>> getSmsRecipients(
            @PathVariable String smsId) {
        return ResponseEntity.ok(ApiResponse.success(smsService.getSmsRecipients(smsId)));
    }
}
