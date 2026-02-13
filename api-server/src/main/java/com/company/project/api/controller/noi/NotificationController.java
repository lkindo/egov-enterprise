package com.company.project.api.controller.noi;

import com.company.project.core.response.ApiResponse;
import com.company.project.service.notification.EgovNotificationService;
import com.company.project.service.notification.dto.NotificationDto;
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

@Tag(name = "Notification", description = "Notification Management APIs")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final EgovNotificationService notificationService;

    @Operation(summary = "알림 목록 조회", description = "등록된 정보 알림 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationDto>>> getNotifications(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.getNotificationList(keyword, pageable)));
    }

    @Operation(summary = "알림 상세 조회", description = "특정 알림의 상세 정보를 조회합니다.")
    @GetMapping("/{ntfcNo}")
    public ResponseEntity<ApiResponse<NotificationDto>> getNotification(
            @Parameter(description = "알림 번호") @PathVariable String ntfcNo) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.getNotification(ntfcNo)));
    }

    @Operation(summary = "알림 등록", description = "새로운 정보 알림을 등록합니다.")
    @PostMapping
    public ResponseEntity<ApiResponse<String>> insertNotification(
            @RequestBody NotificationDto dto) {
        String id = notificationService.createNotification("ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(id));
    }

    @Operation(summary = "알림 수정", description = "기존 정보 알림을 수정합니다.")
    @PutMapping("/{ntfcNo}")
    public ResponseEntity<ApiResponse<Void>> updateNotification(
            @PathVariable String ntfcNo,
            @RequestBody NotificationDto dto) {
        notificationService.updateNotification(ntfcNo, "ADMIN", dto);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "알림 삭제", description = "특정 정보 알림을 삭제합니다.")
    @DeleteMapping("/{ntfcNo}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @PathVariable String ntfcNo) {
        notificationService.deleteNotification(ntfcNo);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Operation(summary = "활성 알림 조회", description = "현재 유효한 알림 목록을 조회합니다.")
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getActiveNotifications() {
        return ResponseEntity.ok(ApiResponse.success(notificationService.getActiveNotifications()));
    }
}
