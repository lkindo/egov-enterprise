package com.company.project.service.image.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 로그인 이미지 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginImageDto {
    private String imageId;
    private String userId;
    private String imageUrl;
    private String useAt;
    private LocalDateTime createdDate;
    private LocalDateTime modifiedDate;
}
