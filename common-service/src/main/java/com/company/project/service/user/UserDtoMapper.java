package com.company.project.service.user;

import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.service.user.dto.UserDto;

/**
 * User ?„ë©”?¸ê³¼ DTO ê°„ì˜ ë§¤í•‘???´ë‹¹?˜ëŠ” ? í‹¸ë¦¬í‹° ?´ë˜??
 */
public class UserDtoMapper {

    /**
     * User ?”í‹°?°ë? UserDtoë¡?ë³€??
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
     * UserDtoë¥?User ?”í‹°?°ë¡œ ë³€??
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
