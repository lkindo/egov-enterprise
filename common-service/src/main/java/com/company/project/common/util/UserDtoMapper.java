package com.company.project.common.util;

import com.company.project.domain.user.entity.User;
import java.util.Objects;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserManageDto;

/**
 * ?¨Ïö©??Í¥Ä??DTO Îß§Ìïë ?†Ìã∏Î¶¨Ìã∞ ?¥Îûò??
 */
public class UserDtoMapper {

    /**
     * User ?îÌã∞?∞Î? UserDtoÎ°?Î≥Ä??
     */
    public static UserDto toUserDto(User user) {
        if (user == null) {
            return null;
        }

        return UserDto.builder()
                .userId(Objects.requireNonNull(user.getUserId()))
                .userNm(Objects.requireNonNull(user.getUserNm()))
                .esntlId(Objects.requireNonNull(user.getEsntlId()))
                .role(user.getRole() != null ? user.getRole().name() : null)
                .createdDate(user.getSbscrbDe())
                .build();
    }

    /**
     * User ?îÌã∞?∞Î? UserManageDtoÎ°?Î≥Ä??
     */
    public static UserManageDto toUserManageDto(User user) {
        if (user == null) {
            return null;
        }

        return UserManageDto.builder()
                .userId(user.getUserId())
                .esntlId(user.getEsntlId())
                .userNm(user.getUserNm())
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
                .emplyrSttusCode(user.getRole() != null ? user.getRole().name() : null)
                .sbscrbDe(user.getSbscrbDe() != null ? user.getSbscrbDe().toString() : null)
                .subDn(user.getSubDn())
                .build();
    }

    /**
     * UserManageDtoÎ•?User ?îÌã∞?∞Î°ú Î≥Ä??(?ÑÏöî???®Ïä§?åÎìú ?∏ÏΩî????Ï∂îÍ? Î°úÏßÅ ?¨Ìï®)
     */
    public static User toUserEntity(UserManageDto dto) {
        if (dto == null) {
            return null;
        }

        return User.builder()
                .userId(Objects.requireNonNull(dto.getUserId()))
                .esntlId(Objects.requireNonNull(dto.getEsntlId()))
                .userNm(Objects.requireNonNull(dto.getUserNm()))
                .password(Objects.requireNonNull(dto.getPassword()))
                .passwordHint(dto.getPasswordHint())
                .passwordCnsr(dto.getPasswordCnsr())
                .emplNo(dto.getEmplNo())
                .sexdstnCode(dto.getSexdstnCode())
                .brth(dto.getBrthdy())
                .areaNo(dto.getAreaNo())
                .homemiddleTelno(dto.getHomemiddleTelno())
                .homeendTelno(dto.getHomeendTelno())
                .moblphonNo(dto.getMoblphonNo())
                .emailAdres(dto.getEmailAdres())
                .zip(dto.getZip())
                .homeadres(dto.getHomeadres())
                .detailAdres(dto.getDetailAdres())
                .ofcpsNm(dto.getOfcpsNm())
                .groupId(dto.getGroupId())
                .orgnztId(dto.getOrgnztId())
                .insttCode(dto.getInsttCode())
                .build();
    }
}
