package nuri.business.service.file;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.core.service.BaseAbstractService;
import nuri.foundation.core.storage.FileStorageService;
import nuri.business.domain.file.FileDetail;
import nuri.business.domain.file.FileDetailId;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
import nuri.business.service.file.dto.FileDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 파일 저장 서비스 구현체
 * - 전자정부 표준프레임워크 5.0 호환성 인증 요건 충족을 위한 서비스 구현
 */
@Slf4j
@Service("egovFileService")
@Transactional(readOnly = true)
public class FileService extends BaseAbstractService implements EgovFileService {

    private final FileMasterRepository fileMasterRepository;
    private final FileDetailRepository fileDetailRepository;
    private final FileStorageService storageService;

    // [Security] 허용된 파일 확장자 화이트리스트
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            "jpg", "jpeg", "png", "gif", "bmp", // 이미지
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "hwp", "txt", // 문서
            "zip", "7z", "rar" // 압축
    );

    public FileService(FileMasterRepository fileMasterRepository,
            FileDetailRepository fileDetailRepository,
            FileStorageService storageService) {
        this.fileMasterRepository = required(fileMasterRepository, "fileMasterRepository 는 null 일 수 없습니다");
        this.fileDetailRepository = required(fileDetailRepository, "fileDetailRepository 는 null 일 수 없습니다");
        this.storageService = required(storageService, "storageService 는 null 일 수 없습니다");
    }

    /**
     * 파일 업로드 (멀티파트)
     */
    @Override
    @Transactional
    public String uploadFiles(List<MultipartFile> files) throws IOException {
        String atchFileId = "FILE_" + UUID.randomUUID().toString().substring(0, 12);
        FileMaster master = new FileMaster(atchFileId);
        master = fileMasterRepository.save(master);

        int fileSn = 1;
        for (MultipartFile file : files) {
            if (file.isEmpty())
                continue;

            // [Security] 파일 확장자 검증
            String originalFilename = file.getOriginalFilename();
            validateFileExtension(originalFilename);

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

            fileDetailRepository.save(detail);
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
        FileMaster master = fileMasterRepository.findById(required(atchFileId, "atchFileId 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return fileDetailRepository.findByFileMaster(required(master, "master 는 null 일 수 없습니다")).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 파일 다운로드를 위한 리소스 조회
     */
    @Override
    public Resource getFileResource(String atchFileId, Integer fileSn) throws IOException {
        FileDetail detail = fileDetailRepository
                .findById(new FileDetailId(required(atchFileId, "atchFileId 는 null 일 수 없습니다"),
                        required(fileSn, "fileSn 는 null 일 수 없습니다")))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        return storageService.loadAsResource(required(detail.getStreFileNm(), "detail.getStreFileNm() 는 null 일 수 없습니다"),
                required(detail.getFileStreCours(), "detail.getFileStreCours() 는 null 일 수 없습니다"));
    }

    /**
     * 파일 삭제 (전체)
     */
    @Override
    @Transactional
    public void deleteFiles(String atchFileId) throws IOException {
        FileMaster master = fileMasterRepository.findById(required(atchFileId, "atchFileId 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        List<FileDetail> details = fileDetailRepository.findByFileMaster(required(master, "master 는 null 일 수 없습니다"));
        for (FileDetail detail : details) {
            storageService.delete(required(detail.getStreFileNm(), "detail.getStreFileNm() 는 null 일 수 없습니다"),
                    required(detail.getFileStreCours(), "detail.getFileStreCours() 는 null 일 수 없습니다"));
        }

        fileMasterRepository.delete(required(master, "master 는 null 일 수 없습니다"));
    }

    /**
     * 파일 삭제 (단건)
     */
    @Override
    @Transactional
    public void deleteFile(String atchFileId, Integer fileSn) throws IOException {
        FileDetail detail = fileDetailRepository
                .findById(new FileDetailId(required(atchFileId, "atchFileId 는 null 일 수 없습니다"),
                        required(fileSn, "fileSn 는 null 일 수 없습니다")))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        storageService.delete(required(detail.getStreFileNm(), "detail.getStreFileNm() 는 null 일 수 없습니다"),
                required(detail.getFileStreCours(), "detail.getFileStreCours() 는 null 일 수 없습니다"));
        fileDetailRepository.delete(required(detail, "detail 는 null 일 수 없습니다"));
    }

    /**
     * 파일 상세 조회 (단건)
     */
    @Override
    public FileDto getFileDetail(String atchFileId, Integer fileSn) {
        FileDetail detail = fileDetailRepository
                .findById(new FileDetailId(required(atchFileId, "atchFileId 는 null 일 수 없습니다"),
                        required(fileSn, "fileSn 는 null 일 수 없습니다")))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return convertToDto(detail);
    }

    /**
     * 파일 수정 (추가 업로드)
     */
    @Override
    @Transactional
    public void updateFiles(String atchFileId, List<MultipartFile> files) throws IOException {
        FileMaster master = fileMasterRepository.findById(required(atchFileId, "atchFileId 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        Integer maxSn = fileDetailRepository.findByFileMaster(required(master, "master 는 null 일 수 없습니다")).stream()
                .mapToInt(FileDetail::getFileSn)
                .max()
                .orElse(0);

        int fileSn = maxSn + 1;
        for (MultipartFile file : files) {
            if (file.isEmpty())
                continue;

            // [Security] 파일 확장자 검증
            String originalFilename = file.getOriginalFilename();
            validateFileExtension(originalFilename);

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

            fileDetailRepository.save(required(detail, "detail 는 null 일 수 없습니다"));
        }
    }

    /**
     * 전체 파일 목록 조회 (관리자용)
     */
    @Override
    public org.springframework.data.domain.Page<FileDto> getAllFileList(
            org.springframework.data.domain.Pageable pageable, String searchKeyword) {
        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            return fileDetailRepository
                    .findByOrignlFileNmContaining(searchKeyword, required(pageable, "pageable 는 null 일 수 없습니다"))
                    .map(this::convertToDto);
        }
        return fileDetailRepository.findAll(required(pageable, "pageable 는 null 일 수 없습니다"))
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

    /**
     * [Security] 파일 확장자 화이트리스트 검징
     */
    private void validateFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            throw new BusinessException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
        String extension = StringUtils.getFilenameExtension(filename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            log.warn("Blocked file upload attempt with forbidden extension: {}", extension);
            throw new BusinessException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
    }
}
