package com.company.project.web.adapter;

import com.company.project.service.syshistory.dto.SystemHistoryDto;
import egovframework.com.sym.log.slg.service.SysHistoryVO;

/**
 * SystemHistoryDto <-> SysHistoryVO ???????
 **/
public class SystemHistoryAdapter {

    /**
     * DTO??????VO???
     **/
    public static SysHistoryVO toVO(SystemHistoryDto dto) {
        if (dto == null)
            return null;

        SysHistoryVO vo = new SysHistoryVO();
        vo.setHistId(dto.getHistId());
        vo.setSysNm(dto.getSysNm());
        vo.setHistSeCode(dto.getHistSeCode());
        vo.setHistCn(dto.getHistCn());
        vo.setAtchFileId(dto.getAtchFileId());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        if (dto.getFrstRegisterPnttm() != null) {
            vo.setFrstRegisterPnttm(dto.getFrstRegisterPnttm().toString().replace("T", " "));
        }
        vo.setLastUpdusrId(dto.getLastUpdusrId());
        if (dto.getLastUpdusrPnttm() != null) {
            vo.setLastUpdusrPnttm(dto.getLastUpdusrPnttm().toString().replace("T", " "));
        }
        return vo;
    }

    /**
     * ????VO??DTO???
     **/
    public static SystemHistoryDto toDto(SysHistoryVO vo) {
        if (vo == null)
            return null;

        return SystemHistoryDto.builder()
                .histId(vo.getHistId())
                .sysNm(vo.getSysNm())
                .histSeCode(vo.getHistSeCode())
                .histCn(vo.getHistCn())
                .atchFileId(vo.getAtchFileId())
                .frstRegisterId(vo.getFrstRegisterId())
                .lastUpdusrId(vo.getLastUpdusrId())
                .build();
    }
}
