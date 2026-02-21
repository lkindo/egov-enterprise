package com.company.project.web.adapter;

import com.company.project.service.auth.dto.AuthorManageDto;
import com.company.project.service.auth.dto.RoleManageDto;
import com.company.project.service.auth.dto.UserAuthorityDto;
import com.company.project.service.group.dto.GroupManageDto;

import egovframework.com.sec.gmt.service.GroupManageVO;
import egovframework.com.sec.ram.service.AuthorManageVO;
import egovframework.com.sec.rgm.service.AuthorGroupVO;
import egovframework.com.sec.rmt.service.RoleManageVO;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class SecurityAdapter {

    // --- AuthorManage ---

    public static AuthorManageDto toDto(AuthorManageVO vo) {
        if (vo == null)
            return null;
        return AuthorManageDto.builder()
                .authorCode(vo.getAuthorCode())
                .authorNm(vo.getAuthorNm())
                .authorDc(vo.getAuthorDc())
                .authorCreatDe(vo.getAuthorCreatDe())
                .build();
    }

    public static AuthorManageVO toVO(AuthorManageDto dto) {
        if (dto == null)
            return null;
        AuthorManageVO vo = new AuthorManageVO();
        vo.setAuthorCode(dto.getAuthorCode());
        vo.setAuthorNm(dto.getAuthorNm());
        vo.setAuthorDc(dto.getAuthorDc());
        vo.setAuthorCreatDe(dto.getAuthorCreatDe());
        return vo;
    }

    public static List<AuthorManageVO> toAuthorVOList(List<AuthorManageDto> dtoList) {
        if (dtoList == null)
            return Collections.emptyList();
        return dtoList.stream().map(SecurityAdapter::toVO).collect(Collectors.toList());
    }

    // --- RoleManage ---

    public static RoleManageDto toDto(RoleManageVO vo) {
        if (vo == null)
            return null;
        return RoleManageDto.builder()
                .roleCode(vo.getRoleCode())
                .roleNm(vo.getRoleNm())
                .rolePttrn(vo.getRolePtn())
                .roleDc(vo.getRoleDc())
                .roleTy(vo.getRoleTyp())
                .roleSort(vo.getRoleSort())
                .creatDt(vo.getRoleCreatDe())
                .build();
    }

    public static RoleManageVO toVO(RoleManageDto dto) {
        if (dto == null)
            return null;
        RoleManageVO vo = new RoleManageVO();
        vo.setRoleCode(dto.getRoleCode());
        vo.setRoleNm(dto.getRoleNm());
        vo.setRolePtn(dto.getRolePttrn());
        vo.setRoleDc(dto.getRoleDc());
        vo.setRoleTyp(dto.getRoleTy());
        vo.setRoleSort(dto.getRoleSort());
        vo.setRoleCreatDe(dto.getCreatDt());
        return vo;
    }

    public static List<RoleManageVO> toRoleVOList(List<RoleManageDto> dtoList) {
        if (dtoList == null)
            return Collections.emptyList();
        return dtoList.stream().map(SecurityAdapter::toVO).collect(Collectors.toList());
    }

    // --- GroupManage ---

    public static GroupManageDto toDto(GroupManageVO vo) {
        if (vo == null)
            return null;
        return GroupManageDto.builder()
                .groupId(vo.getGroupId())
                .groupNm(vo.getGroupNm())
                .groupDc(vo.getGroupDc())
                .groupCreatDe(vo.getGroupCreatDe())
                .build();
    }

    public static GroupManageVO toVO(GroupManageDto dto) {
        if (dto == null)
            return null;
        GroupManageVO vo = new GroupManageVO();
        vo.setGroupId(dto.getGroupId());
        vo.setGroupNm(dto.getGroupNm());
        vo.setGroupDc(dto.getGroupDc());
        vo.setGroupCreatDe(dto.getGroupCreatDe());
        return vo;
    }

    public static List<GroupManageVO> toGroupVOList(List<GroupManageDto> dtoList) {
        if (dtoList == null)
            return Collections.emptyList();
        return dtoList.stream().map(SecurityAdapter::toVO).collect(Collectors.toList());
    }

    // --- UserAuthority (AuthorGroup) ---

    public static UserAuthorityDto toDto(AuthorGroupVO vo) {
        if (vo == null)
            return null;
        return UserAuthorityDto.builder()
                .uniqId(vo.getUniqId())
                .authorCode(vo.getAuthorCode())
                .mberTyCode(vo.getMberTyCode())
                .userNm(vo.getUserNm())
                .build();
    }

    public static AuthorGroupVO toVO(UserAuthorityDto dto) {
        if (dto == null)
            return null;
        AuthorGroupVO vo = new AuthorGroupVO();
        vo.setUniqId(dto.getUniqId());
        vo.setAuthorCode(dto.getAuthorCode());
        vo.setMberTyCode(dto.getMberTyCode());
        vo.setUserNm(dto.getUserNm());
        return vo;
    }

    public static List<AuthorGroupVO> toAuthorGroupVOList(List<UserAuthorityDto> dtoList) {
        if (dtoList == null)
            return Collections.emptyList();
        return dtoList.stream().map(SecurityAdapter::toVO).collect(Collectors.toList());
    }
}
