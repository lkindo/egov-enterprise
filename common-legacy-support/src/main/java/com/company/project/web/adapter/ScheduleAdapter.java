package com.company.project.web.adapter;

import com.company.project.service.schedule.dto.ScheduleDto;
import egovframework.com.cop.smt.sim.service.IndvdlSchdulManageVO;

public class ScheduleAdapter {

    public static IndvdlSchdulManageVO toVO(ScheduleDto dto) {
        if (dto == null)
            return null;
        IndvdlSchdulManageVO vo = new IndvdlSchdulManageVO();
        vo.setSchdulId(dto.getSchdulId());
        vo.setSchdulSe(dto.getSchdulSe());
        vo.setSchdulDeptId(dto.getSchdulDeptId());
        vo.setSchdulKindCode(dto.getSchdulKindCode());
        vo.setSchdulBgnde(dto.getSchdulBgnde());
        vo.setSchdulEndde(dto.getSchdulEndde());
        vo.setSchdulNm(dto.getSchdulNm());
        vo.setSchdulCn(dto.getSchdulCn());
        vo.setSchdulPlace(dto.getSchdulPlace());
        vo.setSchdulIpcrCode(dto.getSchdulIpcrCode());
        vo.setSchdulChargerId(dto.getSchdulChargerId());
        vo.setAtchFileId(dto.getAtchFileId());
        vo.setReptitSeCode(dto.getReptitSeCode());
        vo.setFrstRegisterId(dto.getFrstRegisterId());
        return vo;
    }

    public static ScheduleDto toDto(IndvdlSchdulManageVO vo) {
        if (vo == null)
            return null;
        return ScheduleDto.builder()
                .schdulId(vo.getSchdulId())
                .schdulSe(vo.getSchdulSe())
                .schdulDeptId(vo.getSchdulDeptId())
                .schdulKindCode(vo.getSchdulKindCode())
                .schdulBgnde(vo.getSchdulBgnde())
                .schdulEndde(vo.getSchdulEndde())
                .schdulNm(vo.getSchdulNm())
                .schdulCn(vo.getSchdulCn())
                .schdulPlace(vo.getSchdulPlace())
                .schdulIpcrCode(vo.getSchdulIpcrCode())
                .schdulChargerId(vo.getSchdulChargerId())
                .atchFileId(vo.getAtchFileId())
                .reptitSeCode(vo.getReptitSeCode())
                .frstRegisterId(vo.getFrstRegisterId())
                .build();
    }

    // DeptSchdulManageVO support
    public static egovframework.com.cop.smt.sdm.service.DeptSchdulManageVO toDeptVO(ScheduleDto dto) {
        if (dto == null)
            return null;
        egovframework.com.cop.smt.sdm.service.DeptSchdulManageVO vo = new egovframework.com.cop.smt.sdm.service.DeptSchdulManageVO();
        vo.setSchdulId(dto.getSchdulId());
        vo.setSchdulSe(dto.getSchdulSe());
        vo.setSchdulDeptId(dto.getSchdulDeptId());
        vo.setSchdulKindCode(dto.getSchdulKindCode());
        vo.setSchdulBgnde(dto.getSchdulBgnde());
        vo.setSchdulEndde(dto.getSchdulEndde());
        vo.setSchdulNm(dto.getSchdulNm());
        vo.setSchdulCn(dto.getSchdulCn());
        vo.setSchdulPlace(dto.getSchdulPlace());
        vo.setSchdulIpcrCode(dto.getSchdulIpcrCode());
        vo.setSchdulChargerId(dto.getSchdulChargerId());
        vo.setAtchFileId(dto.getAtchFileId());
        vo.setReptitSeCode(dto.getReptitSeCode());
        vo.setFrstRegisterId(dto.getFrstRegisterId());

        // Helper fields for date parsing if needed, can be handled in controller or
        // added here if dto has LocalDateTime
        return vo;
    }

    public static ScheduleDto toDto(egovframework.com.cop.smt.sdm.service.DeptSchdulManageVO vo) {
        if (vo == null)
            return null;
        return ScheduleDto.builder()
                .schdulId(vo.getSchdulId())
                .schdulSe(vo.getSchdulSe())
                .schdulDeptId(vo.getSchdulDeptId())
                .schdulKindCode(vo.getSchdulKindCode())
                .schdulBgnde(vo.getSchdulBgnde())
                .schdulEndde(vo.getSchdulEndde())
                .schdulNm(vo.getSchdulNm())
                .schdulCn(vo.getSchdulCn())
                .schdulPlace(vo.getSchdulPlace())
                .schdulIpcrCode(vo.getSchdulIpcrCode())
                .schdulChargerId(vo.getSchdulChargerId())
                .atchFileId(vo.getAtchFileId())
                .reptitSeCode(vo.getReptitSeCode())
                .frstRegisterId(vo.getFrstRegisterId())
                .build();
    }

    public static java.util.List<IndvdlSchdulManageVO> toVOList(java.util.List<ScheduleDto> dtoList) {
        if (dtoList == null)
            return null;
        return dtoList.stream()
                .map(ScheduleAdapter::toVO)
                .collect(java.util.stream.Collectors.toList());
    }
}
