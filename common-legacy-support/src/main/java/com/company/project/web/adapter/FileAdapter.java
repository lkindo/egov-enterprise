package com.company.project.web.adapter;

import com.company.project.service.file.dto.FileDto;
import egovframework.com.cmm.service.FileVO;
import java.util.List;
import java.util.stream.Collectors;

/**
 * FileDto <-> FileVO ???????
 * Legacy JSP ?? ? ????
 **/
public class FileAdapter {

    public static FileVO toVO(FileDto dto) {
        if (dto == null)
            return null;
        FileVO vo = new FileVO();
        vo.setAtchFileId(dto.getAtchFileId());
        vo.setFileSn(String.valueOf(dto.getFileSn()));
        vo.setFileStreCours(dto.getFileStreCours());
        vo.setStreFileNm(dto.getStreFileNm());
        vo.setOrignlFileNm(dto.getOrignlFileNm());
        vo.setFileExtsn(dto.getFileExtsn());
        vo.setFileMg(String.valueOf(dto.getFileMg()));
        vo.setFileCn(dto.getFileCn());
        vo.setCreatDt(dto.getCreatDt());
        return vo;
    }

    public static List<FileVO> toVOList(List<FileDto> dtoList) {
        if (dtoList == null)
            return List.of();
        return dtoList.stream()
                .map(FileAdapter::toVO)
                .collect(Collectors.toList());
    }
}
