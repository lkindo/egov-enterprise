package nuri.api.controller.business.notification;

import jakarta.validation.Valid;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.response.PageResponse;
import nuri.business.service.notification.NotificationService;
import nuri.business.service.notification.dto.NotificationDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import nuri.business.security.annotation.LoginUser;
import nuri.foundation.security.service.CustomUserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Notification", description = "알림 관리 API")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationApiController {

    private final NotificationService notificationService;

    @Operation(summary = "알림 목록 조회", description = "로그인한 사용자의 알림 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<NotificationDto>>> getNotifications(
            @LoginUser CustomUserDetails userDetails,
            @Parameter(description = "검색어") @RequestParam(required = false) String searchWrd,
            @PageableDefault(size = 10) Pageable pageable) {
        Page<NotificationDto> result = notificationService.getNotificationList(
                userDetails.getUsername(), searchWrd, pageable);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(result)));
    }

    @Operation(summary = "미열람 알림 수 조회", description = "읽지 않은 알림의 총 개수를 조회합니다.")
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @LoginUser CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.getUnreadCount(userDetails.getUsername())));
    }

    @Operation(summary = "알림 상세 조회", description = "특정 알림의 상세 내용을 조회합니다.")
    @GetMapping("/{notiSn}")
    public ResponseEntity<ApiResponse<NotificationDto>> getNotification(
            @LoginUser CustomUserDetails userDetails,
            @PathVariable String notiSn) {
        return ResponseEntity.ok(ApiResponse.success(
                notificationService.getNotification(notiSn, userDetails.getUsername())));
    }

    @Operation(summary = "알림 읽음 처리", description = "특정 알림을 읽음 상태로 변경합니다.")
    @PostMapping("/{notiSn}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @LoginUser CustomUserDetails userDetails,
            @PathVariable String notiSn) {
        notificationService.markAsRead(notiSn, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "개인 알림 등록", description = "로그인한 사용자 본인의 알림을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> createNotification(
            @LoginUser CustomUserDetails userDetails,
            @Valid @RequestBody NotificationDto request) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.createNotification(userDetails.getUsername(), request)));
    }

    @Operation(summary = "알림 삭제", description = "특정 알림을 삭제합니다.")
    @DeleteMapping("/{notiSn}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @LoginUser CustomUserDetails userDetails,
            @PathVariable String notiSn) {
        notificationService.deleteNotification(notiSn, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
