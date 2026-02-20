package com.company.project.web.adapter;

import com.company.project.service.namecard.dto.NameCardDto;
import egovframework.com.cop.ncm.service.NameCardVO;
import java.util.List;
import java.util.stream.Collectors;

/**
 * NameCardDto <-> NameCardVO ???????
 **/
public class NameCardAdapter {

    public static NameCardVO toVO(NameCardDto dto) {
        if (dto == null)
            return null;
        NameCardVO vo = new NameCardVO();
        vo.setNcrdId(dto.getNcrdId());
        vo.setNcrdNm(dto.getNcrdNm());
        vo.setCmpnyNm(dto.getCmpnyNm());
        vo.setDeptNm(dto.getDeptNm());
        vo.setClsfNm(dto.getClsfNm());
        vo.setOfcpsNm(dto.getOfcpsNm());
        vo.setEmailAdres(dto.getEmailAdres());
        vo.setTelNo(dto.getTelNo());
        vo.setMbtlNum(dto.getMbtlNum());
        vo.setAdres(dto.getAdres());
        vo.setDetailAdres(dto.getDetailAdres());
        vo.setZipCode(dto.getZipCode());
        vo.setRemark(dto.getRemark());
        vo.setOthbcAt(dto.getOthbcAt());
        vo.setNcrdTrgterId(dto.getNcrdTrgterId());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        if (dto.getFrstRegisterPnttm() != null) {
            vo.setFrstRegisterPnttm(dto.getFrstRegisterPnttm().toString());
        }
        return vo;
    }

    public static List<NameCardVO> toVOList(List<NameCardDto> dtoList) {
        if (dtoList == null)
            return List.of();
        return dtoList.stream()
                .map(NameCardAdapter::toVO)
                .collect(Collectors.toList());
    }

    public static NameCardDto toDto(NameCardVO vo) {
        if (vo == null)
            return null;
        return NameCardDto.builder()
                .ncrdId(vo.getNcrdId())
                .ncrdNm(vo.getNcrdNm())
                .cmpnyNm(vo.getCmpnyNm())
                .deptNm(vo.getDeptNm())
                .clsfNm(vo.getClsfNm())
                .ofcpsNm(vo.getOfcpsNm())
                .emailAdres(vo.getEmailAdres())
                .telNo(vo.getTelNo())
                .mbtlNum(vo.getMbtlNum())
                .adres(vo.getAdres())
                .detailAdres(vo.getDetailAdres())
                .zipCode(vo.getZipCode())
                .remark(vo.getRemark())
                .othbcAt(vo.getOthbcAt())
                .ncrdTrgterId(vo.getNcrdTrgterId())
                .frstRegisterId(vo.getFrstRegisterId())
                .build();
    }
}
