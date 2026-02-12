package com.company.project.web.adapter;

import com.company.project.service.community.dto.CommunityDto;
import egovframework.com.cop.cmy.service.Community;
import egovframework.com.cop.cmy.service.CommunityVO;

public class CommunityAdapter {

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

    public static CommunityDto toDto(Community community) {
        if (community == null)
            return null;
        return CommunityDto.builder()
                .cmmntyId(community.getCmmntyId())
                .cmmntyNm(community.getCmmntyNm())
                .cmmntyIntrcn(community.getCmmntyIntrcn())
                .registSeCode(community.getRegistSeCode())
                .tmplatId(community.getTmplatId())
                .useAt(community.getUseAt())
                .frstRegisterId(community.getFrstRegisterId())
                .build();
    }

    public static CommunityVO toVO(CommunityDto dto) {
        if (dto == null)
            return null;
        CommunityVO vo = new CommunityVO();
        vo.setCmmntyId(dto.getCmmntyId());
        vo.setCmmntyNm(dto.getCmmntyNm());
        vo.setCmmntyIntrcn(dto.getCmmntyIntrcn());
        vo.setRegistSeCode(dto.getRegistSeCode());
        vo.setRegistSeCodeNm(dto.getRegistSeCodeNm());
        vo.setTmplatId(dto.getTmplatId());
        vo.setTmplatNm(dto.getTmplatNm());
        vo.setUseAt(dto.getUseAt());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        vo.setFrstRegisterNm(dto.getFrstRegisterNm());
        vo.setFrstRegisterPnttm(dto.getFrstRegisterPnttm());
        return vo;
    }

    public static egovframework.com.cop.cmy.service.CommunityUserVO toUserVO(
            com.company.project.service.community.dto.CommunityUserDto dto) {
        if (dto == null)
            return null;
        egovframework.com.cop.cmy.service.CommunityUserVO vo = new egovframework.com.cop.cmy.service.CommunityUserVO();
        vo.setCmmntyId(dto.getCmmntyId());
        vo.setEmplyrId(dto.getEmplyrId());
        vo.setEmplyrNm(dto.getEmplyrNm());
        vo.setMberSttus(dto.getMberSttus());
        vo.setSbscrbDe(dto.getSbscrbDe());
        vo.setMngrAt(dto.getMngrAt());
        return vo;
    }
}
