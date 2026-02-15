package com.company.project.service.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 사용자 정보 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private String userId;
    private String userNm;
    private String esntlId;
    private String role;
    private String emplNo;
    private String ofcpsNm;
    private LocalDateTime createdDate;

    public static UserDto from(com.company.project.domain.user.User user) {
        if (user == null) return null;
        return UserDto.builder()
                .userId(user.getUserId())
                .userNm(user.getUserNm())
                .esntlId(user.getEsntlId())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .emplNo(user.getEmplNo())
                .ofcpsNm(user.getOfcpsNm())
                .createdDate(user.getCreatedDate())
                .build();
    }
}
