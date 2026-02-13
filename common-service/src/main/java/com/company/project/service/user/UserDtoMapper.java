package com.company.project.service.user;

import com.company.project.domain.user.Role;
import com.company.project.domain.user.User;
import com.company.project.service.user.dto.UserDto;

/**
 * User 도메인과 DTO 간의 매핑을 담당하는 유틸리티 클래스
 */
public class UserDtoMapper {

    /**
     * User 엔티티를 UserDto로 변환
     */
    public static UserDto toUserDto(User user) {
        if (user == null) {
            return null;
        }

        return UserDto.builder()
                .userId(user.getUserId())
                .userNm(user.getUserNm())
                .esntlId(user.getEsntlId())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .createdDate(user.getSbscrbDe())
                .build();
    }

    /**
     * UserDto를 User 엔티티로 변환
     */
    public static User toUserEntity(UserDto userDto) {
        if (userDto == null) {
            return null;
        }

        return User.builder()
                .userId(userDto.getUserId())
                .userNm(userDto.getUserNm())
                .esntlId(userDto.getEsntlId())
                .role(userDto.getRole() != null ? Role.valueOf(userDto.getRole()) : Role.USER)
                .build();
    }
}