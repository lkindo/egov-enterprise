package nuri.api.controller.business.notification;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import nuri.business.service.notification.NotificationService;
import nuri.business.service.notification.dto.NotificationDispatchRequest;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.security.annotation.AdminOrSystem;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리자 알림 발송 API(2026-09-06 DEC-OPS-042, 감사 D09-05 후속).
 *
 * <p>{@code POST /api/v1/notifications} 는 로그인한 본인의 알림을 만드는 개인 API 라 관리자가 다른 사용자에게 보낼
 * 경로가 없었다(종전 화면의 '발송' 은 서버에 아무것도 보내지 않는 데모였고 DEC-OPS-038 이 걷었다). 이 컨트롤러는
 * {@code /api/v1/admin/**} URL 게이트와 메서드 인가를 함께 지나고, 서비스가 다시 ADMIN/SYSTEM 을 확인한다.
 */
@Tag(name = "Notification", description = "알림 관리 API")
@RestController
@RequestMapping("/api/v1/admin/notifications")
@RequiredArgsConstructor
public class NotificationAdminApiController {

    private final NotificationService notificationService;

    @Operation(summary = "관리자 알림 발송",
            description = "선택한 사용자들에게 같은 제목·내용의 앱 내 알림을 만듭니다. 수신자가 하나라도 존재하지 않으면 전체를 거부합니다.")
    @io.swagger.v3.oas.annotations.responses.ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200",
                    description = "발송 성공 — 만든 알림 수", useReturnTypeSchema = true),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404",
                    description = "수신자로 지정한 사용자가 존재하지 않음 — 부분 발송 없이 전체 거부 (code: C002)",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(ref = "#/components/schemas/ApiResponseVoid")))
    })
    @PostMapping("/dispatch")
    @org.springframework.security.access.prepost.PreAuthorize("@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.notification.NotificationAdminApiController#dispatchNotifications')")
    public ResponseEntity<ApiResponse<Integer>> dispatchNotifications(@Valid @RequestBody NotificationDispatchRequest request) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.dispatchToUsers(request)));
    }
}
