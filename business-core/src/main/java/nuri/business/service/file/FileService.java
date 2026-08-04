package nuri.business.service.file;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
import nuri.foundation.core.storage.FileStorageService;
import nuri.business.domain.file.FileDetail;

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
import java.util.stream.Collectors;

/**
 * 파일 저장 서비스 구현체
 * - 전자정부 표준프레임워크 5.0 호환성 인증 요건 충족을 위한 서비스 구현
 */
@Slf4j
@Service
@Transactional(readOnly = true)
public class FileService extends BaseAbstractService {

    private final FileMasterRepository fileMasterRepository;
    private final FileDetailRepository fileDetailRepository;
    private final FileStorageService storageService;
    private final FileAccessPolicy accessPolicy;

    // [Security] 허용된 파일 확장자 화이트리스트
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            "jpg", "jpeg", "png", "gif", "bmp", // 이미지
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "hwp", "txt", // 문서
            "zip", "7z", "rar" // 압축
    );

    public FileService(FileMasterRepository fileMasterRepository,
            FileDetailRepository fileDetailRepository,
            FileStorageService storageService,
            FileAccessPolicy accessPolicy) {
        this.fileMasterRepository = required(fileMasterRepository, "fileMasterRepository 는 null 일 수 없습니다");
        this.fileDetailRepository = required(fileDetailRepository, "fileDetailRepository 는 null 일 수 없습니다");
        this.storageService = required(storageService, "storageService 는 null 일 수 없습니다");
        this.accessPolicy = required(accessPolicy, "accessPolicy 는 null 일 수 없습니다");
    }

    /**
     * 파일 업로드 (멀티파트)
     */
    @Transactional
    public String uploadFiles(List<MultipartFile> files) throws IOException {
        // 선(先) 검증 패스: 하나라도 거부되면 어떤 파일도 디스크에 쓰지 않는다(부분 실패 시 고아 파일 방지).
        for (MultipartFile file : files) {
            if (!file.isEmpty()) {
                validateFileExtension(file.getOriginalFilename());
            }
        }

        String atchFileId = nuri.foundation.core.util.IdGenerationUtil.generateId("FILE_", 12);
        FileMaster master = new FileMaster(atchFileId);
        master = fileMasterRepository.save(master);

        int fileSn = 1;
        for (MultipartFile file : files) {
            if (file.isEmpty())
                continue;

            // 확장자 검증은 위 선-검증 패스에서 완료됨.
            String targetPath = "general/" + atchFileId;
            String savedFilename = storageService.store(file, targetPath);

            FileDetail detail = FileDetail.builder()
                    .fileMaster(master)
                    .atchFileSeq(fileSn++)
                    .fileStrgPath(targetPath)
                    .strgFileNm(savedFilename)
                    .orgnlFileNm(file.getOriginalFilename())
                    .fileEstn(StringUtils.getFilenameExtension(file.getOriginalFilename()))
                    .fileSz(file.getSize())
                    .build();

            fileDetailRepository.save(detail);
        }

        return atchFileId;
    }

    /**
     * 첨부파일 목록 조회
     */
    public List<FileDto> getFileList(String atchFileId) {
        if (atchFileId == null)
            return List.of();
        FileMaster master = fileMasterRepository.findById(required(atchFileId, "atchFileId 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        // [IDOR] 인증만으로는 부족하다 — 이 첨부에 도달할 근거가 있는 주체인지 검증한다.
        accessPolicy.assertReadable(master);
        return fileDetailRepository.findByFileMaster(required(master, "master 는 null 일 수 없습니다")).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /**
     * 파일 다운로드를 위한 리소스 조회
     */
    public Resource getFileResource(String atchFileId, Integer fileSn) throws IOException {
        FileDetail detail = fileDetailRepository
                .findByFileMasterAtchFileIdAndAtchFileSeq(required(atchFileId, "atchFileId 는 null 일 수 없습니다"),
                        required(fileSn, "fileSn 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        // [IDOR] 다운로드는 목록보다 노출이 크다 — 같은 도달성 기준을 적용한다.
        accessPolicy.assertReadable(detail.getFileMaster());

        return storageService.loadAsResource(required(detail.getStrgFileNm(), "detail.getStrgFileNm() 는 null 일 수 없습니다"),
                required(detail.getFileStrgPath(), "detail.getFileStrgPath() 는 null 일 수 없습니다"));
    }

    /**
     * 파일 삭제 (전체)
     */
    @Transactional
    public void deleteFiles(String atchFileId) throws IOException {
        FileMaster master = fileMasterRepository.findById(required(atchFileId, "atchFileId 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        List<FileDetail> details = fileDetailRepository.findByFileMaster(required(master, "master 는 null 일 수 없습니다"));
        for (FileDetail detail : details) {
            storageService.delete(required(detail.getStrgFileNm(), "detail.getStrgFileNm() 는 null 일 수 없습니다"),
                    required(detail.getFileStrgPath(), "detail.getFileStrgPath() 는 null 일 수 없습니다"));
        }

        fileMasterRepository.delete(required(master, "master 는 null 일 수 없습니다"));
    }

    /**
     * 파일 삭제 (단건)
     */
    @Transactional
    public void deleteFile(String atchFileId, Integer fileSn) throws IOException {
        FileDetail detail = fileDetailRepository
                .findByFileMasterAtchFileIdAndAtchFileSeq(required(atchFileId, "atchFileId 는 null 일 수 없습니다"),
                        required(fileSn, "fileSn 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        storageService.delete(required(detail.getStrgFileNm(), "detail.getStrgFileNm() 는 null 일 수 없습니다"),
                required(detail.getFileStrgPath(), "detail.getFileStrgPath() 는 null 일 수 없습니다"));
        fileDetailRepository.delete(required(detail, "detail 는 null 일 수 없습니다"));
    }

    /**
     * 파일 상세 조회 (단건)
     */
    public FileDto getFileDetail(String atchFileId, Integer fileSn) {
        FileDetail detail = fileDetailRepository
                .findByFileMasterAtchFileIdAndAtchFileSeq(required(atchFileId, "atchFileId 는 null 일 수 없습니다"),
                        required(fileSn, "fileSn 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        // [IDOR] 단건 상세도 같은 기준. (현재 HTTP 미노출이나, 노출 시 무가드가 되지 않도록 함께 닫는다.)
        accessPolicy.assertReadable(detail.getFileMaster());
        return convertToDto(detail);
    }

    /**
     * 파일 수정 (추가 업로드)
     */
    @Transactional
    public void updateFiles(String atchFileId, List<MultipartFile> files) throws IOException {
        FileMaster master = fileMasterRepository.findById(required(atchFileId, "atchFileId 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        Integer maxSn = fileDetailRepository.findByFileMaster(required(master, "master 는 null 일 수 없습니다")).stream()
                .mapToInt(detail -> detail.getAtchFileSeq())
                .max()
                .orElse(0);

        // 선(先) 검증 패스: 하나라도 거부되면 어떤 파일도 디스크에 쓰지 않는다(부분 실패 시 고아 파일 방지).
        for (MultipartFile file : files) {
            if (!file.isEmpty()) {
                validateFileExtension(file.getOriginalFilename());
            }
        }

        int fileSn = maxSn + 1;
        for (MultipartFile file : files) {
            if (file.isEmpty())
                continue;

            // 확장자 검증은 위 선-검증 패스에서 완료됨.
            String targetPath = "general/" + atchFileId;
            String savedFilename = storageService.store(file, targetPath);

            FileDetail detail = FileDetail.builder()
                    .fileMaster(master)
                    .atchFileSeq(fileSn++)
                    .fileStrgPath(targetPath)
                    .strgFileNm(savedFilename)
                    .orgnlFileNm(file.getOriginalFilename())
                    .fileEstn(StringUtils.getFilenameExtension(file.getOriginalFilename()))
                    .fileSz(file.getSize())
                    .build();

            fileDetailRepository.save(required(detail, "detail 는 null 일 수 없습니다"));
        }
    }

    /**
     * 전체 파일 목록 조회 (관리자용)
     */
    public org.springframework.data.domain.Page<FileDto> getAllFileList(
            org.springframework.data.domain.Pageable pageable, String searchKeyword) {
        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            return fileDetailRepository
                    .findByOrgnlFileNmContaining(searchKeyword, required(pageable, "pageable 는 null 일 수 없습니다"))
                    .map(this::convertToDto);
        }
        return fileDetailRepository.findAll(required(pageable, "pageable 는 null 일 수 없습니다"))
                .map(this::convertToDto);
    }

    private FileDto convertToDto(FileDetail d) {
        return FileDto.builder()
                .atchFileId(d.getFileMaster().getAtchFileId())
                .fileSn(d.getAtchFileSeq())
                .fileStreCours(d.getFileStrgPath())
                .streFileNm(d.getStrgFileNm())
                .orignlFileNm(d.getOrgnlFileNm())
                .fileExtsn(d.getFileEstn())
                .fileMg(d.getFileSz())
                .fileCn(d.getFileCn())
                .crtDt(d.getCrtDt())
                .build();
    }

    /**
     * [Security] 파일 확장자 화이트리스트 검징
     */
    private void validateFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            throw new BusinessException(CommonErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
        String extension = StringUtils.getFilenameExtension(filename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            log.warn("Blocked file upload attempt with forbidden extension: {}", extension);
            throw new BusinessException(CommonErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
    }
}
