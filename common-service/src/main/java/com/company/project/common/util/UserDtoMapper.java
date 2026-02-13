package com.company.project.common.util;

import com.company.project.domain.user.User;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserManageDto;

/**
 * 사용자 관련 DTO 매핑 유틸리티 클래스
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
     * User 엔티티를 UserManageDto로 변환
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
                .sbscrbDe(user.getSbscrbDe() != null ?
                        user.getSbscrbDe().toString() : null)
                .subDn(user.getSubDn())
                .build();
    }
    
    /**
     * UserManageDto를 User 엔티티로 변환 (필요시 패스워드 인코딩 등 추가 로직 포함)
     */
    public static User toUserEntity(UserManageDto dto) {
        if (dto == null) {
            return null;
        }

        return User.builder()
                .userId(dto.getUserId())
                .esntlId(dto.getEsntlId())
                .userNm(dto.getUserNm())
                .password(dto.getPassword())
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