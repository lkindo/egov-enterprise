package com.company.project.service.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.lang.NonNull;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * ??????뺣낫 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    @NonNull
    private String userId;
    @NonNull
    private String userNm;
    @NonNull
    private String esntlId;
    private String role;
    private String emplNo;
    private String ofcpsNm;
    private LocalDateTime createdDate;

    public static UserDto from(com.company.project.domain.user.entity.User user) {
        if (user == null)
            return null;
        return UserDto.builder()
                .userId(Objects.requireNonNull(user.getUserId()))
                .userNm(Objects.requireNonNull(user.getUserNm()))
                .esntlId(Objects.requireNonNull(user.getEsntlId()))
                .role(user.getRole() != null ? user.getRole().name() : null)
                .emplNo(user.getEmplNo())
                .ofcpsNm(user.getOfcpsNm())
                .createdDate(user.getCreatedDate())
                .build();
    }
}
