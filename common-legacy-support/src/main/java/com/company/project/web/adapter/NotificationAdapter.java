package com.company.project.web.adapter;

import com.company.project.service.notification.dto.NotificationDto;
import egovframework.com.uss.ion.noi.service.NotificationVO;

/**
 * NotificationDto <-> NotificationVO ???????
 **/
public class NotificationAdapter {

    public static NotificationVO toVO(NotificationDto dto) {
        if (dto == null)
            return null;

        NotificationVO vo = new NotificationVO();
        vo.setNtfcNo(dto.getNtfcNo());
        vo.setNtfcSj(dto.getNtfcSj());
        vo.setNtfcCn(dto.getNtfcCn());
        vo.setNtfcDate(dto.getNtfcDate());
        vo.setNtfcTime(dto.getNtfcTime());
        vo.setBhNtfcIntrvlString(dto.getBhNtfcIntrvl());
        vo.setUniqId(dto.getUniqId());
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

    public static NotificationDto toDto(NotificationVO vo) {
        if (vo == null)
            return null;

        return NotificationDto.builder()
                .ntfcNo(vo.getNtfcNo())
                .ntfcSj(vo.getNtfcSj())
                .ntfcCn(vo.getNtfcCn())
                .ntfcDate(vo.getNtfcDate())
                .ntfcTime(vo.getNtfcTime())
                .bhNtfcIntrvl(vo.getBhNtfcIntrvlString())
                .uniqId(vo.getUniqId())
                .frstRegisterId(vo.getFrstRegisterId())
                .build();
    }
}
