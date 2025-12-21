package com.company.project.service.file;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.file.FileGroup;
import com.company.project.domain.file.FileGroupRepository;
import com.company.project.domain.file.FileItem;
import com.company.project.domain.file.FileItemRepository;
import com.company.project.service.file.dto.FileDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.fdl.cmmn.exception.FdlException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileService {

    @Value("${file.upload.path:./uploads}")
    private String uploadPath;

    private final FileGroupRepository fileGroupRepository;
    private final FileItemRepository fileItemRepository;
    private final EgovIdGnrService fileIdGnrService;

    @Transactional
    public String uploadFiles(List<MultipartFile> files, String atchFileId) throws IOException {
        FileGroup fileGroup;
        int sn = 0;

        try {
            if (atchFileId == null || atchFileId.isEmpty()) {
                String newId = fileIdGnrService.getNextStringId();
                fileGroup = new FileGroup(newId);
            } else {
                fileGroup = fileGroupRepository.findByAtchFileId(atchFileId)
                        .orElse(new FileGroup(atchFileId));
                sn = fileGroup.getFileItems().size();
            }
        } catch (FdlException e) {
            log.error("Failed to generate File ID", e);
            throw new BusinessException("Failed to generate file ID", ErrorCode.INTERNAL_SERVER_ERROR);
        }

        fileGroupRepository.save(fileGroup);

        File dir = new File(uploadPath);
        if (!dir.exists()) {
            dir.mkdirs();
        }

        for (MultipartFile file : files) {
            if (file.isEmpty())
                continue;

            String originalName = file.getOriginalFilename();
            String extension = "";
            if (originalName != null && originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf(".") + 1);
            }

            String savedName = UUID.randomUUID().toString() + (extension.isEmpty() ? "" : "." + extension);
            Path targetPath = Paths.get(uploadPath, savedName);
            file.transferTo(targetPath);

            FileItem item = FileItem.builder()
                    .fileGroup(fileGroup)
                    .fileSn(sn++)
                    .fileStreCours(uploadPath)
                    .streFileNm(savedName)
                    .orignlFileNm(originalName)
                    .fileExtsn(extension)
                    .fileSize(file.getSize())
                    .build();

            fileGroup.addFileItem(item);
        }

        return fileGroup.getAtchFileId();
    }

    @Transactional(readOnly = true)
    public List<FileDto> getFileList(String atchFileId) {
        FileGroup group = fileGroupRepository.findByAtchFileId(atchFileId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        return group.getFileItems().stream()
                .map(FileDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public FileItem getFileItem(String atchFileId, Integer fileSn) {
        FileGroup group = fileGroupRepository.findByAtchFileId(atchFileId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        return fileItemRepository.findByFileGroupAndFileSn(group, fileSn)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }
}
