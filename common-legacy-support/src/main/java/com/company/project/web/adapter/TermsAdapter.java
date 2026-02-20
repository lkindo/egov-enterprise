package com.company.project.web.adapter;

import com.company.project.service.terms.dto.TermsDto;
import egovframework.com.uss.sam.stp.service.StplatManageVO;

public class TermsAdapter {

    public static StplatManageVO toVO(TermsDto dto) {
        if (dto == null)
            return null;
        StplatManageVO vo = new StplatManageVO();
        vo.setUseStplatId(dto.getUseStplatId());
        vo.setUseStplatNm(dto.getUseStplatNm());
        vo.setUseStplatCn(dto.getUseStplatCn());
        vo.setInfoProvdAgreCn(dto.getInfoProvdAgreCn());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        // Date conversion if needed
        return vo;
    }

    public static TermsDto toDto(StplatManageVO vo) {
        if (vo == null)
            return null;
        return TermsDto.builder()
                .useStplatId(vo.getUseStplatId())
                .useStplatNm(vo.getUseStplatNm())
                .useStplatCn(vo.getUseStplatCn())
                .infoProvdAgreCn(vo.getInfoProvdAgreCn())
                // .frstRegisterId(vo.getFrstRegisterId()) // Usually used for create
                .build();
    }
}
