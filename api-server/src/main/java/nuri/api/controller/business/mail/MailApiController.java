package nuri.api.controller.business.mail;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.mail.MailService;
import nuri.business.service.mail.dto.MailDeliveryStatusDto;
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

    @Operation(summary = "발신 메일 목록 조회", description = "발송된 메일 목록을 페이징하여 조회합니다. "
            + "본문은 발신자 본인에게만 싣고, 사용자 수신자는 주소 대신 이름으로 표시합니다.")
    @GetMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.mail.MailApiController#getSentMails')")
    public ResponseEntity<ApiResponse<PageResponse<SentMailDto>>> getSentMails(
            @RequestParam(required = false) String searchCondition,
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<SentMailDto> result = mailService.getSentMailList(searchCondition, searchKeyword, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "발신 메일 상세 조회", description = "특정 메일의 발송 상세 정보를 조회합니다. "
            + "본문은 발신자 본인에게만 싣습니다.")
    @GetMapping("/{emlDsptchSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.mail.MailApiController#getSentMail')")
    public ResponseEntity<ApiResponse<SentMailDto>> getSentMail(
            @Parameter(description = "이메일 발신 일련번호") @PathVariable Long emlDsptchSn) {
        return ResponseEntity.ok(ApiResponse.success(mailService.getSentMail(emlDsptchSn)));
    }

    @Operation(summary = "메일 발송", description = "새로운 메일을 작성하여 평문으로 발송합니다. "
            + "첨부 발송은 지원하지 않으며 atchFileSn 을 지정하면 400 으로 거부합니다.")
    @PostMapping
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.mail.MailApiController#sendMail')")
    public ResponseEntity<ApiResponse<Long>> sendMail(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SentMailDto sentMailDto) {
        Long emlDsptchSn = mailService.sendMail(userDetails.getUsername(), sentMailDto);
        return ResponseEntity.ok(ApiResponse.success(emlDsptchSn));
    }

    @Operation(summary = "메일 발송 가능 상태 조회", description = """
            이 배포에 SMTP 가 연결돼 있는지 조회합니다.
            `deliveryConfigured=false` 면 발송 접수는 되지만 모든 메일이 실패로 기록됩니다 \
            (발송 파이프라인의 장애가 아니라 배포 형상입니다).""")
    @GetMapping("/delivery-status")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.mail.MailApiController#getMailDeliveryStatus')")
    public ResponseEntity<ApiResponse<MailDeliveryStatusDto>> getMailDeliveryStatus() {
        return ResponseEntity.ok(ApiResponse.success(mailService.getDeliveryStatus()));
    }

    @Operation(summary = "메일 재발송", description = """
            실패했거나 대기에 10분 넘게 멈춘 본인 메일을 같은 이력으로 다시 보냅니다. 사용자 수신자는 지금 등록된 주소로 보냅니다.
            이미 발송된 메일·수신자를 다시 찾을 수 없는 메일은 400, 처리 중인 메일은 409, 남의 메일은 403 입니다.""")
    @PostMapping("/{emlDsptchSn}/resend")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.mail.MailApiController#resendMail')")
    public ResponseEntity<ApiResponse<Void>> resendMail(
            @Parameter(description = "이메일 발신 일련번호") @PathVariable Long emlDsptchSn) {
        mailService.resendMail(emlDsptchSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "메일 삭제", description = "발송 메일 내역을 삭제합니다.")
    @DeleteMapping("/{emlDsptchSn}")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.mail.MailApiController#deleteMail')")
    public ResponseEntity<ApiResponse<Void>> deleteMail(@PathVariable Long emlDsptchSn) {
        mailService.deleteMail(emlDsptchSn);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
