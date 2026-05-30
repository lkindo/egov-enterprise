package nuri.api.controller.business.mail;

import nuri.foundation.core.response.ApiResponse;
import nuri.business.core.response.PageResponse;
import nuri.business.service.mail.MailService;
import nuri.business.service.mail.dto.SentMailDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Mail", description = "메일 관리 API")
@RestController
@RequestMapping("/api/v1/mails")
@RequiredArgsConstructor
public class MailApiController {

    private final MailService mailService;

    @Operation(summary = "발신 메일 목록 조회", description = "발송된 메일 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SentMailDto>>> getSentMails(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<SentMailDto> result = mailService.getSentMailList(searchCondition, searchKeyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "발신 메일 상세 조회", description = "특정 메일의 발송 상세 정보를 조회합니다.")
    @GetMapping("/{mssageId}")
    public ResponseEntity<ApiResponse<SentMailDto>> getSentMail(
            @Parameter(description = "메시지 ID") @PathVariable String mssageId) {
        return ResponseEntity.ok(ApiResponse.success(mailService.getSentMail(mssageId)));
    }

    @Operation(summary = "메일 발송", description = "새로운 메일을 작성하여 발송합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> sendMail(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SentMailDto sentMailDto) {
        String mssageId = mailService.sendMail(userDetails.getUsername(), sentMailDto);
        return ResponseEntity.ok(ApiResponse.success(mssageId));
    }

    @Operation(summary = "메일 삭제", description = "발송 메일 내역을 삭제합니다.")
    @DeleteMapping("/{mssageId}")
    public ResponseEntity<ApiResponse<Void>> deleteMail(@PathVariable String mssageId) {
        mailService.deleteMail(mssageId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
