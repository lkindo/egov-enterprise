package com.company.project.service.file;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.core.storage.FileStorageService;
import com.company.project.domain.file.FileDetail;
import com.company.project.domain.file.FileDetailId;
import com.company.project.domain.file.FileDetailRepository;
import com.company.project.domain.file.FileMaster;
import com.company.project.domain.file.FileMasterRepository;
import com.company.project.service.file.dto.FileDto;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 파일 저장 서비스 구현체
 * - 전자정부 표준프레임워크 5.0 호환성 인증 요건 충족을 위한 서비스 구현
 */
@Service("egovFileService")
@Transactional(readOnly = true)
public class FileService extends EgovAbstractServiceImpl implements EgovFileService {

    private final FileMasterRepository fileMasterRepository;
    private final FileDetailRepository fileDetailRepository;
    private final FileStorageService storageService;

    public FileService(FileMasterRepository fileMasterRepository,
            FileDetailRepository fileDetailRepository,
            FileStorageService storageService) {
        this.fileMasterRepository = fileMasterRepository;
        this.fileDetailRepository = fileDetailRepository;
        this.storageService = storageService;
    }

    /**
     * 파일 업로드 (멀티파트)
     */
    @Override
    @Transactional
    public String uploadFiles(List<MultipartFile> files) throws IOException {
        String atchFileId = "FILE_" + UUID.randomUUID().toString().substring(0, 12);
        FileMaster master = FileMaster.builder().atchFileId(atchFileId).build();
        master = Objects.requireNonNull(fileMasterRepository.save(Objects.requireNonNull(master)));

        int fileSn = 1;
        for (MultipartFile file : files) {
            if (file.isEmpty())
                continue;

            String targetPath = "general/" + atchFileId;
            String savedFilename = storageService.store(file, targetPath);

            FileDetail detail = FileDetail.builder()
                    .fileMaster(master)
                    .fileSn(fileSn++)
                    .fileStreCours(targetPath)
                    .streFileNm(savedFilename)
                    .orignlFileNm(file.getOriginalFilename())
                    .fileExtsn(StringUtils.getFilenameExtension(file.getOriginalFilename()))     
                    .fileMg(file.getSize())
                    .build();

            fileDetailRepository.save(Objects.requireNonNull(detail));
        }

        return atchFileId;
    }

    /**
     * 첨부파일 목록 조회
     */
    @Override
    public List<FileDto> getFileList(String atchFileId) {
        if (atchFileId == null)
            return List.of();
        FileMaster master = fileMasterRepository.findById(Objects.requireNonNull(atchFileId))    
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return fileDetailRepository.findByFileMaster(Objects.requireNonNull(master)).stream()    
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 파일 다운로드를 위한 리소스 조회
     */
    @Override
    public Resource getFileResource(String atchFileId, Integer fileSn) throws IOException {      
        FileDetail detail = fileDetailRepository
                .findById(new FileDetailId(Objects.requireNonNull(atchFileId), Objects.requireNonNull(fileSn)))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        return storageService.loadAsResource(Objects.requireNonNull(detail.getStreFileNm()),     
                Objects.requireNonNull(detail.getFileStreCours()));
    }

    /**
     * 파일 삭제 (전체)
     */
    @Override
    @Transactional
    public void deleteFiles(String atchFileId) throws IOException {
        FileMaster master = fileMasterRepository.findById(Objects.requireNonNull(atchFileId))    
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        List<FileDetail> details = fileDetailRepository.findByFileMaster(Objects.requireNonNull(master));
        for (FileDetail detail : details) {
            storageService.delete(Objects.requireNonNull(detail.getStreFileNm()),
                    Objects.requireNonNull(detail.getFileStreCours()));
        }

        fileMasterRepository.delete(Objects.requireNonNull(master));
    }

    /**
     * 파일 삭제 (단건)
     */
    @Override
    @Transactional
    public void deleteFile(String atchFileId, Integer fileSn) throws IOException {
        FileDetail detail = fileDetailRepository
                .findById(new FileDetailId(Objects.requireNonNull(atchFileId), Objects.requireNonNull(fileSn)))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        storageService.delete(Objects.requireNonNull(detail.getStreFileNm()),
                Objects.requireNonNull(detail.getFileStreCours()));
        fileDetailRepository.delete(Objects.requireNonNull(detail));
    }

    /**
     * 파일 상세 조회 (단건)
     */
    @Override
    public FileDto getFileDetail(String atchFileId, Integer fileSn) {
        FileDetail detail = fileDetailRepository
                .findById(new FileDetailId(Objects.requireNonNull(atchFileId), Objects.requireNonNull(fileSn)))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return convertToDto(detail);
    }

    /**
     * 파일 수정 (추가 업로드)
     */
    @Override
    @Transactional
    public void updateFiles(String atchFileId, List<MultipartFile> files) throws IOException {   
        FileMaster master = fileMasterRepository.findById(Objects.requireNonNull(atchFileId))    
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        Integer maxSn = fileDetailRepository.findByFileMaster(Objects.requireNonNull(master)).stream()
                .mapToInt(FileDetail::getFileSn)
                .max()
                .orElse(0);

        int fileSn = maxSn + 1;
        for (MultipartFile file : files) {
            if (file.isEmpty())
                continue;

            String targetPath = "general/" + atchFileId;
            String savedFilename = storageService.store(file, targetPath);

            FileDetail detail = FileDetail.builder()
                    .fileMaster(master)
                    .fileSn(fileSn++)
                    .fileStreCours(targetPath)
                    .streFileNm(savedFilename)
                    .orignlFileNm(file.getOriginalFilename())
                    .fileExtsn(StringUtils.getFilenameExtension(file.getOriginalFilename()))     
                    .fileMg(file.getSize())
                    .build();

            fileDetailRepository.save(Objects.requireNonNull(detail));
        }
    }

    /**
     * 전체 파일 목록 조회 (관리자용)
     */
    @Override
    public org.springframework.data.domain.Page<FileDto> getAllFileList(
            org.springframework.data.domain.Pageable pageable, String searchKeyword) {
        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            return fileDetailRepository.findByOrignlFileNmContaining(searchKeyword, Objects.requireNonNull(pageable))
                    .map(this::convertToDto);
        }
        return fileDetailRepository.findAll(Objects.requireNonNull(pageable))
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
