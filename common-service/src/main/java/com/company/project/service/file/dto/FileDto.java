package com.company.project.service.file.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 파일 정보 DTO
 */
@Getter
@Builder
public class FileDto {
    private String atchFileId;
    private Integer fileSn;
    private String orignlFileNm;
    private Long fileMg;
    private String fileExtsn;
}
