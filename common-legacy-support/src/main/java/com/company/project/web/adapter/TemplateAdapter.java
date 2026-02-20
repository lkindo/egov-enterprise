package com.company.project.web.adapter;

import com.company.project.service.template.dto.TemplateDto;
import egovframework.com.cop.tpl.service.TemplateInfVO;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class TemplateAdapter {

    public static TemplateInfVO toVO(TemplateDto dto) {
        if (dto == null)
            return null;
        TemplateInfVO vo = new TemplateInfVO();
        vo.setTmplatId(dto.getTmplatId());
        vo.setTmplatNm(dto.getTmplatNm());
        vo.setTmplatSeCode(dto.getTmplatSeCode());
        vo.setTmplatCours(dto.getTmplatCours());
        vo.setUseAt(dto.getUseAt());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        vo.setFrstRegisterPnttm(dto.getFrstRegisterPnttm() != null ? dto.getFrstRegisterPnttm().toString() : null);
        return vo;
    }

    public static List<TemplateInfVO> toVOList(List<TemplateDto> dtoList) {
        if (dtoList == null || dtoList.isEmpty())
            return Collections.emptyList();
        return dtoList.stream().map(TemplateAdapter::toVO).collect(Collectors.toList());
    }
}
