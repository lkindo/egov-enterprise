package com.company.project.web.adapter;

import com.company.project.service.deptjob.dto.DeptJobBoxDto;
import egovframework.com.cop.smt.djm.service.DeptJobBxVO;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class DeptJobBoxAdapter {

    public static DeptJobBxVO toVO(DeptJobBoxDto dto) {
        if (dto == null)
            return null;
        DeptJobBxVO vo = new DeptJobBxVO();
        vo.setDeptJobBxId(dto.getDeptJobbxId());
        vo.setDeptJobBxNm(dto.getDeptJobbxNm());
        vo.setDeptId(dto.getDeptId());
        vo.setIndictOrdr(dto.getIndictOrdr());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        vo.setFrstRegisterPnttm(dto.getFrstRegistPnttm() != null ? dto.getFrstRegistPnttm().toString() : null);
        return vo;
    }

    public static List<DeptJobBxVO> toVOList(List<DeptJobBoxDto> dtoList) {
        if (dtoList == null || dtoList.isEmpty())
            return Collections.emptyList();
        return dtoList.stream().map(DeptJobBoxAdapter::toVO).collect(Collectors.toList());
    }
}
