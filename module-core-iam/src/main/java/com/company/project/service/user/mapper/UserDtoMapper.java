package com.company.project.service.user.mapper;

import com.company.project.domain.user.entity.User;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.usermanagement.dto.UserManageDto;
import org.springframework.stereotype.Component;
import java.time.format.DateTimeFormatter;

@Component
public class UserDtoMapper {

    public static UserManageDto toUserManageDto(User user) {
        if (user == null)
            return null;
        return UserManageDto.builder()
                .userId(user.getUserId())
                .esntlId(user.getEsntlId())
                .userNm(user.getUserNm())
                .password(user.getPassword())
                .passwordHint(user.getPasswordHint())
                .passwordCnsr(user.getPasswordCnsr())
                .emplNo(user.getEmplNo())
                .sexdstnCode(user.getSexdstnCode())
                .brthdy(user.getBrth())
                .areaNo(user.getAreaNo())
                .homemiddleTelno(user.getHomemiddleTelno())
                .homeendTelno(user.getHomeendTelno())
                .homeadres(user.getHomeadres())
                .detailAdres(user.getDetailAdres())
                .zip(user.getZip())
                .moblphonNo(user.getMoblphonNo())
                .emailAdres(user.getEmailAdres())
                .ofcpsNm(user.getOfcpsNm())
                .groupId(user.getGroupId())
                .orgnztId(user.getOrgnztId())
                .insttCode(user.getInsttCode())
                .sbscrbDe(user.getSbscrbDe() != null ? user.getSbscrbDe().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        : null)
                .build();
    }

    public static UserDto toUserDto(User user) {
        if (user == null)
            return null;
        return UserDto.builder()
                .userId(user.getUserId())
                .userNm(user.getUserNm())
                .esntlId(user.getEsntlId())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .build();
    }
}
