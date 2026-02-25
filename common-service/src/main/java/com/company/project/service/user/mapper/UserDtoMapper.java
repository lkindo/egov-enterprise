package com.company.project.service.user.mapper;

import com.company.project.domain.user.entity.User;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserManageDto;
import org.springframework.stereotype.Component;

import java.util.Objects;

@Component
public class UserDtoMapper {

    public static UserDto toUserDto(User user) {
        if (user == null) return null;
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

    public static UserManageDto toUserManageDto(User user) {
        if (user == null) return null;
        return UserManageDto.builder()
                .userId(user.getUserId())
                .esntlId(user.getEsntlId())
                .userNm(user.getUserNm())
                .emplNo(user.getEmplNo())
                .sexdstnCode(user.getSexdstnCode())
                .brthdy(user.getBrth())
                .areaNo(user.getAreaNo())
                .homemiddleTelno(user.getHomemiddleTelno())
                .homeendTelno(user.getHomeendTelno())
                .moblphonNo(user.getMoblphonNo())
                .emailAdres(user.getEmailAdres())
                .zip(user.getZip())
                .homeadres(user.getHomeadres())
                .detailAdres(user.getDetailAdres())
                .ofcpsNm(user.getOfcpsNm())
                .groupId(user.getGroupId())
                .orgnztId(user.getOrgnztId())
                .insttCode(user.getInsttCode())
                .emplyrSttusCode(user.getEmpStatus())
                .sbscrbDe(user.getSbscrbDe() != null ? user.getSbscrbDe().toString() : null)
                .build();
    }

    public static User toEntity(UserDto userDto) {
        if (userDto == null) return null;
        return User.builder()
                .userId(userDto.getUserId())
                .userNm(userDto.getUserNm())
                .esntlId(userDto.getEsntlId())
                .emplNo(userDto.getEmplNo())
                .ofcpsNm(userDto.getOfcpsNm())
                .build();
    }
}
