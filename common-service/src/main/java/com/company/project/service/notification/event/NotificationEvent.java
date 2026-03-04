package com.company.project.service.notification.event;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class NotificationEvent {
    private final String userId;
    private final String message;
    private final String type;
}