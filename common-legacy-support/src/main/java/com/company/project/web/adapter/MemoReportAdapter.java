package com.company.project.web.adapter;

import com.company.project.service.memoreport.dto.MemoReportDto;
import egovframework.com.cop.smt.mrm.service.MemoReprtVO;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class MemoReportAdapter {

    public static MemoReprtVO toVO(MemoReportDto dto) {
        if (dto == null)
            return null;
        MemoReprtVO vo = new MemoReprtVO();
        vo.setReprtId(dto.getReprtId());
        vo.setReprtSj(dto.getReprtSj());
        vo.setReprtDe(dto.getReportDe());
        vo.setWrterId(dto.getWrterId());
        vo.setReportrId(dto.getReportrId());
        vo.setReprtCn(dto.getReportCn());
        vo.setDrctMatter(dto.getDrctMatter());
        vo.setDrctMatterRegistDt(dto.getDrctMatterRegistDt());
        vo.setReportrInqireDt(dto.getReportrInqireDt());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        vo.setFrstRegisterPnttm(dto.getFrstRegistPnttm() != null ? dto.getFrstRegistPnttm().toString() : null);
        return vo;
    }

    public static List<MemoReprtVO> toVOList(List<MemoReportDto> dtoList) {
        if (dtoList == null || dtoList.isEmpty())
            return Collections.emptyList();
        return dtoList.stream().map(MemoReportAdapter::toVO).collect(Collectors.toList());
    }
}
