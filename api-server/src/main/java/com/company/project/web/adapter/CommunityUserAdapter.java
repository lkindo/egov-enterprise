package com.company.project.web.adapter;

import com.company.project.service.community.dto.CommunityUserDto;
import egovframework.com.cop.cmy.service.CommunityUser;
import egovframework.com.cop.cmy.service.CommunityUserVO;

public class CommunityUserAdapter {

    public static CommunityUserDto toDto(CommunityUserVO vo) {
        if (vo == null)
            return null;
        return CommunityUserDto.builder()
                .cmmntyId(vo.getCmmntyId())
                .emplyrId(vo.getEmplyrId())
                .mngrAt(vo.getMngrAt())
                .mberSttus(vo.getMberSttus())
                .useAt(vo.getUseAt())
                .frstRegisterId(vo.getFrstRegisterId())
                .build();
    }

    public static CommunityUserDto toDto(CommunityUser user) {
        if (user == null)
            return null;
        return CommunityUserDto.builder()
                .cmmntyId(user.getCmmntyId())
                .emplyrId(user.getEmplyrId())
                .mngrAt(user.getMngrAt())
                .mberSttus(user.getMberSttus())
                .useAt(user.getUseAt())
                .frstRegisterId(user.getFrstRegisterId())
                .build();
    }

    public static CommunityUserVO toVO(CommunityUserDto dto) {
        if (dto == null)
            return null;
        CommunityUserVO vo = new CommunityUserVO();
        vo.setCmmntyId(dto.getCmmntyId());
        vo.setEmplyrId(dto.getEmplyrId());
        vo.setEmplyrNm(dto.getEmplyrNm());
        vo.setMngrAt(dto.getMngrAt());
        vo.setSbscrbDe(dto.getSbscrbDe());
        vo.setSecsnDe(dto.getSecsnDe());
        vo.setMberSttus(dto.getMberSttus());
        vo.setMberSttusNm(dto.getMberSttusNm());
        vo.setUseAt(dto.getUseAt());
        vo.setFrstRegisterPnttm(dto.getFrstRegisterPnttm());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        return vo;
    }
}
