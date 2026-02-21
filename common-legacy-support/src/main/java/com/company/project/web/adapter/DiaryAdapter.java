package com.company.project.web.adapter;

import com.company.project.service.duty.dto.DutyDto;
import egovframework.com.cop.smt.dsm.service.DiaryManageVO;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class DiaryAdapter {

    public static DiaryManageVO toVO(DutyDto dto) {
        if (dto == null)
            return null;
        DiaryManageVO vo = new DiaryManageVO();
        vo.setDiaryId(dto.getBndtId()); // ID ?? ???????bndtId ????
        vo.setSchdulId(dto.getBndtId());
        vo.setDiaryNm(" ??? " + dto.getBndtDe());
        vo.setDrctMatter(dto.getBndtDe());
        vo.setPartclrMatter(dto.getRemark());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        vo.setFrstRegisterPnttm(dto.getFrstRegistPnttm() != null ? dto.getFrstRegistPnttm().toString() : null);
        return vo;
    }

    public static List<DiaryManageVO> toVOList(List<DutyDto> dtoList) {
        if (dtoList == null || dtoList.isEmpty())
            return Collections.emptyList();
        return dtoList.stream().map(DiaryAdapter::toVO).collect(Collectors.toList());
    }
}
