package com.company.project.web.adapter;

import com.company.project.service.community.dto.CommunityDto;
import com.company.project.service.community.dto.CommunityUserDto;

import egovframework.com.cop.cmy.service.Community;
import egovframework.com.cop.cmy.service.CommunityUser;
import egovframework.com.cop.cmy.service.CommunityVO;
import egovframework.com.cop.cmy.service.CommunityUserVO;

public class CommunityAdapter {

    public static CommunityVO toVO(CommunityDto dto) {
        if (dto == null)
            return null;

        CommunityVO vo = new CommunityVO();
        vo.setCmmntyId(dto.getCmmntyId());
        vo.setCmmntyNm(dto.getCmmntyNm());
        vo.setCmmntyIntrcn(dto.getCmmntyIntrcn());
        vo.setRegistSeCode(dto.getRegistSeCode());
        vo.setTmplatId(dto.getTmplatId());
        vo.setUseAt(dto.getUseAt());
        vo.setFrstRegisterId(dto.getFrstRegisterId());

        if (dto.getFrstRegisterPnttm() != null) {
            vo.setFrstRegisterPnttm(dto.getFrstRegisterPnttm().toString());
        }

        return vo;
    }

    public static CommunityDto toDto(CommunityVO vo) {
        if (vo == null)
            return null;

        return CommunityDto.builder()
                .cmmntyId(vo.getCmmntyId())
                .cmmntyNm(vo.getCmmntyNm())
                .cmmntyIntrcn(vo.getCmmntyIntrcn())
                .registSeCode(vo.getRegistSeCode())
                .tmplatId(vo.getTmplatId())
                .useAt(vo.getUseAt())
                .frstRegisterId(vo.getFrstRegisterId())
                .build();
    }

    public static CommunityDto toDto(Community legacyCommunity) {
        if (legacyCommunity == null)
            return null;

        return CommunityDto.builder()
                .cmmntyId(legacyCommunity.getCmmntyId())
                .cmmntyNm(legacyCommunity.getCmmntyNm())
                .cmmntyIntrcn(legacyCommunity.getCmmntyIntrcn())
                .registSeCode(legacyCommunity.getRegistSeCode())
                .tmplatId(legacyCommunity.getTmplatId())
                .useAt(legacyCommunity.getUseAt())
                .frstRegisterId(legacyCommunity.getFrstRegisterId())
                .build();
    }

    public static CommunityUserVO toUserVO(CommunityUserDto dto) {
        if (dto == null)
            return null;

        CommunityUserVO vo = new CommunityUserVO();
        vo.setCmmntyId(dto.getCmmntyId());
        vo.setEmplyrId(dto.getEmplyrId());
        vo.setEmplyrNm(dto.getEmplyrNm());
        vo.setMngrAt(dto.getMngrAt());
        vo.setMberSttus(dto.getMberSttus());
        vo.setUseAt(dto.getUseAt());

        if (dto.getFrstRegisterPnttm() != null) {
            vo.setFrstRegisterPnttm(dto.getFrstRegisterPnttm().toString());
        }

        return vo;
    }

    public static CommunityUserDto toUserDto(CommunityUserVO vo) {
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

    public static CommunityUserDto toUserDto(CommunityUser legacyUser) {
        if (legacyUser == null)
            return null;

        return CommunityUserDto.builder()
                .cmmntyId(legacyUser.getCmmntyId())
                .emplyrId(legacyUser.getEmplyrId())
                .mngrAt(legacyUser.getMngrAt())
                .mberSttus(legacyUser.getMberSttus())
                .useAt(legacyUser.getUseAt())
                .frstRegisterId(legacyUser.getFrstRegisterId())
                .build();
    }
}
