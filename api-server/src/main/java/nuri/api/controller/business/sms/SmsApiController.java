package nuri.api.controller.business.sms;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.security.annotation.LoginUser;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.business.service.sms.SmsService;
import nuri.foundation.core.annotation.PrivacyAccess;
import nuri.business.service.sms.dto.SmsDeliveryStatusDto;
import nuri.business.service.sms.dto.SmsDto;
import nuri.business.service.sms.dto.SmsRecptnDto;
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

    private final SmsService smsService;

    /**
     * 이 배포에서 문자가 실제로 전달될 수 있는지 알린다.
     *
     * <p>발송 이력·수신자 결과는 <b>보낸 뒤에야</b> 알 수 있다. 그런데 게이트웨이가 없는 배포에서는
     * 모든 결과가 실패로 정해져 있으므로, 관리자가 문안을 작성하기 <b>전에</b> 그 사실을 알아야 한다.
     * 화면은 이 값으로 안내 배너를 띄운다.
     */
    @Operation(summary = "SMS 발송 가능 상태 조회",
            description = """
                    이 배포에 실제 발송 게이트웨이가 연결돼 있는지 조회합니다.
                    `deliveryConfigured=false` 면 발송 접수는 성공하지만 모든 수신자 결과가 실패로 기록됩니다 \
                    (발송 파이프라인의 장애가 아니라 배포 형상입니다).""")
    @GetMapping("/delivery-status")
    public ResponseEntity<ApiResponse<SmsDeliveryStatusDto>> getDeliveryStatus() {
        return ResponseEntity.ok(ApiResponse.success(smsService.getDeliveryStatus()));
    }

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
    @GetMapping("/{smsTrsmSn}")
    public ResponseEntity<ApiResponse<SmsDto>> getSms(
            @Parameter(description = "SMS 전송 일련번호") @PathVariable Long smsTrsmSn) {
        return ResponseEntity.ok(ApiResponse.success(smsService.getSms(smsTrsmSn)));
    }

    /**
     * ⚠ 이 응답만 <b>수신자 전화번호 원문</b>을 내보낸다.
     *
     * <p>같은 컨트롤러의 목록·상세({@code getSmsList}·{@code getSms})는 읽기 매퍼가 recipients 를
     * 항상 빈 배열로 채우므로 연락처가 실리지 않는다. 즉 이 엔드포인트가 SMS 도메인에서
     * 타인의 개인정보가 나가는 <b>유일한 창구</b>이고, {@code SmsRecptnMapper} 는 단순 필드 복사라
     * 마스킹이 없다({@code PiiMaskUtil} 은 로그에만 쓰인다 — 로그는 가리면서 응답은 그대로였다).
     *
     * <p>그래서 {@code @PrivacyAccess} 를 붙여 성공 조회를 {@code tb_privacy_log} 에 남긴다.
     * 부착 지점 전수는 {@code PrivacyAccessCensusLinterTest} 가 양방향으로 동결한다.
     */
    @Operation(summary = "SMS 수신자 목록 조회", description = "특정 SMS의 수신자 목록을 조회합니다.")
    @PrivacyAccess("SMS 수신자 목록(수신 전화번호)")
    @GetMapping("/{smsTrsmSn}/recipients")
    public ResponseEntity<ApiResponse<List<SmsRecptnDto>>> getSmsRecipients(
            @Parameter(description = "SMS 전송 일련번호") @PathVariable Long smsTrsmSn) {
        return ResponseEntity.ok(ApiResponse.success(smsService.getSmsRecipients(smsTrsmSn)));
    }

    @Operation(summary = "SMS 발송", description = "새로운 SMS를 발송합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> sendSms(
            @LoginUser CustomUserDetails userDetails,
            @Valid @RequestBody SmsDto smsDto) {
        Long smsTrsmSn = smsService.sendSms(userDetails.getEsntlId(), smsDto);
        return ResponseEntity.ok(ApiResponse.success(smsTrsmSn));
    }
}
