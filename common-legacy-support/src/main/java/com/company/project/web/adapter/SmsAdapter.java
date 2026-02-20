package com.company.project.web.adapter;

import com.company.project.service.sms.dto.SmsDto;
import egovframework.com.cop.sms.service.SmsVO;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class SmsAdapter {

    public static SmsVO toVO(SmsDto dto) {
        if (dto == null)
            return null;
        SmsVO vo = new SmsVO();
        vo.setSmsId(dto.getSmsId());
        vo.setTrnsmitTelno(dto.getTrnsmitTelno());
        vo.setTrnsmitCn(dto.getTrnsmitCn());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        // vo.setFrstRegisterPnttm(dto.getFrstRegistPnttm() != null ?
        // dto.getFrstRegistPnttm().toString() : null);
        return vo;
    }

    public static List<SmsVO> toVOList(List<SmsDto> dtoList) {
        if (dtoList == null || dtoList.isEmpty())
            return Collections.emptyList();
        return dtoList.stream().map(SmsAdapter::toVO).collect(Collectors.toList());
    }
}
