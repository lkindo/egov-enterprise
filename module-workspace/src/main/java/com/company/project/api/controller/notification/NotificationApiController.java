package com.company.project.api.controller.notification;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.notification.NotificationService;
import com.company.project.service.notification.dto.NotificationDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Tag(name = "Notification", description = "알림 관리 API")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationApiController {

    private final NotificationService notificationService;

    @Operation(summary = "나의 알림 목록 조회", description = "현재 로그인한 사용자의 활성 알림 목록을 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getMyNotifications(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.getActiveNotifications()));
    }

    @Operation(summary = "읽지 않은 알림 개수 조회", description = "현재 로그인한 사용자의 읽지 않은 알림 개수를 조회합니다.")
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.getUnreadCount(userDetails.getUsername())));
    }

    @Operation(summary = "알림 읽음 처리", description = "특정 알림을 읽음 상태로 변경합니다.")
    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable String id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
