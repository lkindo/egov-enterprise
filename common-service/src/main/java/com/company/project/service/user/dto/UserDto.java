package com.company.project.service.user.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 사용자 정보 DTO
 */
@Getter
@Builder
public class UserDto {
    private String userId;
    private String userNm;
    private String esntlId;
    private String role;
    private LocalDateTime createdDate;
}
