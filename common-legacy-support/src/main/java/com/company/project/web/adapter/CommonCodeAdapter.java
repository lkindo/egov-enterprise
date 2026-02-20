package com.company.project.web.adapter;

import com.company.project.service.code.dto.CmmnClCodeDto;
import com.company.project.service.code.dto.CmmnCodeDto;
import com.company.project.service.code.dto.CmmnDetailCodeDto;

import egovframework.com.sym.ccm.cca.service.CmmnCodeVO;
import egovframework.com.sym.ccm.ccc.service.CmmnClCodeVO;
import egovframework.com.sym.ccm.cde.service.CmmnDetailCodeVO;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class CommonCodeAdapter {

    // --- Classification Code (ClCode) ---

    public static CmmnClCodeDto toDto(CmmnClCodeVO vo) {
        if (vo == null)
            return null;
        return CmmnClCodeDto.builder()
                .clCode(vo.getClCode())
                .clCodeNm(vo.getClCodeNm())
                .clCodeDc(vo.getClCodeDc())
                .useAt(vo.getUseAt())
                .frstRegisterId(vo.getFrstRegisterId())
                .lastUpdusrId(vo.getLastUpdusrId())
                .build();
    }

    public static CmmnClCodeVO toVO(CmmnClCodeDto dto) {
        if (dto == null)
            return null;
        CmmnClCodeVO vo = new CmmnClCodeVO();
        vo.setClCode(dto.getClCode());
        vo.setClCodeNm(dto.getClCodeNm());
        vo.setClCodeDc(dto.getClCodeDc());
        vo.setUseAt(dto.getUseAt());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        vo.setLastUpdusrId(dto.getLastUpdusrId());
        return vo;
    }

    public static List<CmmnClCodeVO> toClCodeVOList(List<CmmnClCodeDto> dtoList) {
        if (dtoList == null)
            return Collections.emptyList();
        return dtoList.stream().map(CommonCodeAdapter::toVO).collect(Collectors.toList());
    }

    // --- Common Code (CmmnCode) ---

    public static CmmnCodeDto toDto(CmmnCodeVO vo) {
        if (vo == null)
            return null;
        return CmmnCodeDto.builder()
                .codeId(vo.getCodeId())
                .codeIdNm(vo.getCodeIdNm())
                .codeIdDc(vo.getCodeIdDc())
                .clCode(vo.getClCode())
                .clCodeNm(vo.getClCodeNm())
                .useAt(vo.getUseAt())
                .frstRegisterId(vo.getFrstRegisterId())
                .lastUpdusrId(vo.getLastUpdusrId())
                .build();
    }

    public static CmmnCodeVO toVO(CmmnCodeDto dto) {
        if (dto == null)
            return null;
        CmmnCodeVO vo = new CmmnCodeVO();
        vo.setCodeId(dto.getCodeId());
        vo.setCodeIdNm(dto.getCodeIdNm());
        vo.setCodeIdDc(dto.getCodeIdDc());
        vo.setClCode(dto.getClCode());
        vo.setClCodeNm(dto.getClCodeNm());
        vo.setUseAt(dto.getUseAt());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        vo.setLastUpdusrId(dto.getLastUpdusrId());
        return vo;
    }

    public static List<CmmnCodeVO> toCodeVOList(List<CmmnCodeDto> dtoList) {
        if (dtoList == null)
            return Collections.emptyList();
        return dtoList.stream().map(CommonCodeAdapter::toVO).collect(Collectors.toList());
    }

    // --- Detail Code (DetailCode) ---

    public static CmmnDetailCodeDto toDto(CmmnDetailCodeVO vo) {
        if (vo == null)
            return null;
        return CmmnDetailCodeDto.builder()
                .code(vo.getCode())
                .codeNm(vo.getCodeNm())
                .codeDc(vo.getCodeDc())
                .codeId(vo.getCodeId())
                .codeIdNm(vo.getCodeIdNm())
                .useAt(vo.getUseAt())
                .frstRegisterId(vo.getFrstRegisterId())
                .lastUpdusrId(vo.getLastUpdusrId())
                .build();
    }

    public static CmmnDetailCodeVO toVO(CmmnDetailCodeDto dto) {
        if (dto == null)
            return null;
        CmmnDetailCodeVO vo = new CmmnDetailCodeVO();
        vo.setCode(dto.getCode());
        vo.setCodeNm(dto.getCodeNm());
        vo.setCodeDc(dto.getCodeDc());
        vo.setCodeId(dto.getCodeId());
        vo.setCodeIdNm(dto.getCodeIdNm());
        vo.setUseAt(dto.getUseAt());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        vo.setLastUpdusrId(dto.getLastUpdusrId());
        return vo;
    }

    public static List<CmmnDetailCodeVO> toDetailCodeVOList(List<CmmnDetailCodeDto> dtoList) {
        if (dtoList == null)
            return Collections.emptyList();
        return dtoList.stream().map(CommonCodeAdapter::toVO).collect(Collectors.toList());
    }
}
