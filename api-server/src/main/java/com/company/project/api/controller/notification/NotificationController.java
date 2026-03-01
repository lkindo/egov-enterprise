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

@Tag(name = "Notification", description = "?åÎ¶º Í¥ÄÎ¶?API")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "???åÎ¶º Î™©Î°ù Ï°∞Ìöå")
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getMyNotifications(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.getActiveNotifications()));
    }

    @Operation(summary = "?ΩÏ? ?äÏ? ?åÎ¶º Í∞úÏàò Ï°∞Ìöå")
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.getUnreadCount(userDetails.getUsername())));
    }

    @Operation(summary = "?åÎ¶º ?ΩÏùå Ï≤òÎ¶¨")
    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable String id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
