package com.company.project.service.file;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.file.FileDetail;
import com.company.project.domain.file.FileDetailId;
import com.company.project.domain.file.FileDetailRepository;
import com.company.project.domain.file.FileMaster;
import com.company.project.domain.file.FileMasterRepository;
import com.company.project.service.file.dto.FileDto;
import egovframework.com.cmm.EgovWebUtil;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * JPA 기반 파일 관리 서비스 구현체
 * - 전자정부프레임워크 5.0 호환성 인증 요건 충족
 * - EgovAbstractServiceImpl 상속 및 EgovFileService 인터페이스 구현
 */
@Service("egovFileService")
@Transactional(readOnly = true)
public class FileService extends EgovAbstractServiceImpl implements EgovFileService {

    private final FileMasterRepository fileMasterRepository;
    private final FileDetailRepository fileDetailRepository;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    public FileService(FileMasterRepository fileMasterRepository,
            FileDetailRepository fileDetailRepository) {
        this.fileMasterRepository = fileMasterRepository;
        this.fileDetailRepository = fileDetailRepository;
    }

    /**
     * 파일 업로드 (멀티파일 지원)
     */
    @Override
    @Transactional
    public String uploadFiles(List<MultipartFile> files) throws IOException {
        String atchFileId = "FILE_" + UUID.randomUUID().toString().substring(0, 12);
        FileMaster master = FileMaster.builder().atchFileId(atchFileId).build();
        FileMaster savedMaster = fileMasterRepository.save(master);

        saveFileDetails(savedMaster, files, 1);

        return savedMaster.getAtchFileId();
    }

    private void saveFileDetails(FileMaster master, List<MultipartFile> files, int startSn) throws IOException {
        int fileSn = startSn;
        for (MultipartFile file : files) {
            if (file.isEmpty())
                continue;

            String originalFilename = EgovWebUtil.filePathBlackList(file.getOriginalFilename());
            String extension = originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf(".") + 1)
                    : "";
            String storedFilename = UUID.randomUUID().toString() + "." + extension;

            File destDir = new File(uploadDir);
            if (!destDir.exists())
                destDir.mkdirs();

            File destFile = new File(destDir, storedFilename);
            file.transferTo(destFile);

            FileDetail detail = FileDetail.builder()
                    .fileMaster(master)
                    .fileSn(fileSn++)
                    .fileStreCours(uploadDir)
                    .streFileNm(storedFilename)
                    .orignlFileNm(originalFilename)
                    .fileExtsn(extension)
                    .fileMg(file.getSize())
                    .build();

            master.addFileDetail(detail);
        }
        fileMasterRepository.save(master);
    }

    /**
     * 첨부파일 목록 조회
     */
    @Override
    public List<FileDto> getFileList(String atchFileId) {
        if (atchFileId == null) {
            return List.of();
        }
        FileMaster master = fileMasterRepository.findById(atchFileId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return fileDetailRepository.findByFileMaster(master).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 파일 다운로드를 위한 Resource 조회
     */
    @Override
    public Resource getFileResource(String atchFileId, Integer fileSn) throws IOException {
        FileDetail detail = fileDetailRepository.findById(new FileDetailId(atchFileId, fileSn))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        Path filePath = Paths.get(detail.getFileStreCours()).resolve(Objects.requireNonNull(detail.getStreFileNm()));
        return new UrlResource(filePath.toUri());
    }

    @Override
    @Transactional
    public void deleteFiles(String atchFileId) throws IOException {
        FileMaster master = fileMasterRepository.findById(atchFileId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        List<FileDetail> details = fileDetailRepository.findByFileMaster(master);
        for (FileDetail detail : details) {
            deletePhysicalFile(detail);
        }

        fileMasterRepository.delete(master);
    }

    @Override
    @Transactional
    public void deleteFile(String atchFileId, Integer fileSn) throws IOException {
        FileDetail detail = fileDetailRepository.findById(new FileDetailId(atchFileId, fileSn))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        deletePhysicalFile(detail);
        fileDetailRepository.delete(detail);
    }

    @Override
    public FileDto getFileDetail(String atchFileId, Integer fileSn) {
        FileDetail detail = fileDetailRepository.findById(new FileDetailId(atchFileId, fileSn))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return convertToDto(detail);
    }

    @Override
    @Transactional
    public void updateFiles(String atchFileId, List<MultipartFile> files) throws IOException {
        if (atchFileId == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        FileMaster master = fileMasterRepository.findById(atchFileId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        Integer maxSn = fileDetailRepository.findByFileMaster(master).stream()
                .mapToInt(FileDetail::getFileSn)
                .max()
                .orElse(0);

        saveFileDetails(master, files, maxSn + 1);
    }

    private void deletePhysicalFile(FileDetail detail) {
        String streFileNm = detail.getStreFileNm();
        if (streFileNm == null)
            return;
        Path filePath = Paths.get(detail.getFileStreCours()).resolve(streFileNm);
        File file = filePath.toFile();
        if (file.exists()) {
            file.delete();
        }
    }

    @Override
    public org.springframework.data.domain.Page<FileDto> getAllFileList(
            org.springframework.data.domain.Pageable pageable, String searchKeyword) {
        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            return fileDetailRepository.findByOrignlFileNmContaining(searchKeyword, pageable)
                    .map(this::convertToDto);
        }
        return fileDetailRepository.findAll(pageable)
                .map(this::convertToDto);
    }

    private FileDto convertToDto(FileDetail d) {
        return FileDto.builder()
                .atchFileId(d.getFileMaster().getAtchFileId())
                .fileSn(d.getFileSn())
                .fileStreCours(d.getFileStreCours())
                .streFileNm(d.getStreFileNm())
                .orignlFileNm(d.getOrignlFileNm())
                .fileExtsn(d.getFileExtsn())
                .fileMg(d.getFileMg())
                .fileCn(d.getFileCn())
                .build();
    }
}
