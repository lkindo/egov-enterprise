package com.company.project.api.controller.mail;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.response.PageResponse;
import com.company.project.service.mail.MailService;
import com.company.project.service.mail.dto.SentMailDto;
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
 * 메일 발송 관리를 위한 API 컨트롤러
 */
@Tag(name = "Mail Management", description = "메일 발송 관리 API (Admin)")
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/operation/mails")
@RequiredArgsConstructor
public class MailApiController {

    private final MailService mailService;

    @Operation(summary = "메일 발송 내역 조회", description = "발송된 메일 목록을 페이징 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SentMailDto>>> getMailList(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {

        Page<SentMailDto> result = mailService.getSentMailList(keyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "메일 상세 조회", description = "특정 메일의 발송 상세 정보를 조회합니다.")
    @GetMapping("/{mssageId}")
    public ResponseEntity<ApiResponse<SentMailDto>> getMail(@PathVariable String mssageId) {
        SentMailDto dto = mailService.getSentMail(mssageId);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @Operation(summary = "메일 발송", description = "새로운 메일을 발송합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> sendMail(@RequestBody SentMailDto mailDto) {
        // 실제 운영 환경에서는 현재 로그인한 사용자 ID를 전달해야 함
        String userId = "ADMIN";
        String mssageId = mailService.sendMail(userId, mailDto);
        return ResponseEntity.ok(ApiResponse.success(mssageId));
    }

    @Operation(summary = "메일 내역 삭제")
    @DeleteMapping("/{mssageId}")
    public ResponseEntity<ApiResponse<Void>> deleteMail(@PathVariable String mssageId) {
        mailService.deleteMail(mssageId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
