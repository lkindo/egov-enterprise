package com.company.project.service.file.dto;

import com.company.project.domain.file.FileItem;

public record FileDto(
        Long id,
        String atchFileId,
        Integer fileSn,
        String orignlFileNm,
        String fileExtsn,
        Long fileSize) {
    public static FileDto from(FileItem item) {
        return new FileDto(
                item.getId(),
                item.getFileGroup().getAtchFileId(),
                item.getFileSn(),
                item.getOrignlFileNm(),
                item.getFileExtsn(),
                item.getFileSize());
    }
}
