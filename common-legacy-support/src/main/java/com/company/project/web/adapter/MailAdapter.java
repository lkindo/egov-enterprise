package com.company.project.web.adapter;

import com.company.project.service.mail.dto.SentMailDto;
import egovframework.com.cop.ems.service.SndngMailVO;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class MailAdapter {

    public static SndngMailVO toVO(SentMailDto dto) {
        if (dto == null)
            return null;
        SndngMailVO vo = new SndngMailVO();
        vo.setMssageId(dto.getMssageId());
        vo.setSndngResultCode(dto.getSndngResultCode());
        vo.setDsptchPerson(dto.getDsptchPerson());
        vo.setRecptnPerson(dto.getRecptnPerson());
        vo.setSj(dto.getSj());
        vo.setEmailCn(dto.getEmailCn());
        return vo;
    }

    public static List<SndngMailVO> toVOList(List<SentMailDto> dtoList) {
        if (dtoList == null || dtoList.isEmpty())
            return Collections.emptyList();
        return dtoList.stream().map(MailAdapter::toVO).collect(Collectors.toList());
    }
}
