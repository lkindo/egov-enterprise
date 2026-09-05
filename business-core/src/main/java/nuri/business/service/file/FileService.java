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
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
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
    private static final int MAX_FILES_PER_REQUEST = 20;
    /** FileDetail.orgnlFileNm의 @Column(length = 100)과 같은 상한. */
    private static final int MAX_ORIGINAL_FILENAME_LENGTH = 100;
    private static final long MAX_FILE_SIZE_BYTES = 10L * 1024 * 1024;
    private static final long MAX_REQUEST_SIZE_BYTES = 50L * 1024 * 1024;
    private static final int SIGNATURE_READ_SIZE = 16;

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
    public Long uploadFiles(List<MultipartFile> files) throws IOException {
        // 선(先) 검증 패스: 하나라도 거부되면 어떤 DB 행·파일도 쓰지 않는다.
        validateUploadBatch(files, true);

        FileMaster master = fileMasterRepository.save(FileMaster.create());
        Long atchFileSn = required(master.getAtchFileSn(), "자동 생성된 atchFileSn 은 null 일 수 없습니다");

        storeFileDetails(master, files, 1, "general/" + atchFileSn);

        return atchFileSn;
    }

    /**
     * 첨부파일 목록 조회
     */
    public List<FileDto> getFileList(Long atchFileSn) {
        if (atchFileSn == null)
            return List.of();
        FileMaster master = fileMasterRepository.findById(required(atchFileSn, "atchFileSn 는 null 일 수 없습니다"))
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
    public Resource getFileResource(Long atchFileSn, Integer fileSn) throws IOException {
        FileDetail detail = fileDetailRepository
                .findByFileMasterAtchFileSnAndAtchFileSeq(required(atchFileSn, "atchFileSn 는 null 일 수 없습니다"),
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
    public void deleteFiles(Long atchFileSn) throws IOException {
        FileMaster master = fileMasterRepository.findById(required(atchFileSn, "atchFileSn 는 null 일 수 없습니다"))
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
    public void deleteFile(Long atchFileSn, Integer fileSn) throws IOException {
        FileDetail detail = fileDetailRepository
                .findByFileMasterAtchFileSnAndAtchFileSeq(required(atchFileSn, "atchFileSn 는 null 일 수 없습니다"),
                        required(fileSn, "fileSn 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        // [인가] 삭제는 열람보다 위험하다 — 공유 근거로는 지울 수 없고, 관리자도 개인 귀속 첨부는 지우지 못한다.
        //   HTTP 로 처음 노출되는 경로(2026-09-05 DELETE /files/{atchFileSn}/{fileSn})이므로 저장소를 건드리기 전에 판정한다.
        accessPolicy.assertDeletable(detail.getFileMaster());

        storageService.delete(required(detail.getStrgFileNm(), "detail.getStrgFileNm() 는 null 일 수 없습니다"),
                required(detail.getFileStrgPath(), "detail.getFileStrgPath() 는 null 일 수 없습니다"));
        fileDetailRepository.delete(required(detail, "detail 는 null 일 수 없습니다"));
    }

    /**
     * 파일 상세 조회 (단건)
     */
    public FileDto getFileDetail(Long atchFileSn, Integer fileSn) {
        FileDetail detail = fileDetailRepository
                .findByFileMasterAtchFileSnAndAtchFileSeq(required(atchFileSn, "atchFileSn 는 null 일 수 없습니다"),
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
    public void updateFiles(Long atchFileSn, List<MultipartFile> files) throws IOException {
        FileMaster master = fileMasterRepository.findById(required(atchFileSn, "atchFileSn 는 null 일 수 없습니다"))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        Integer maxSn = fileDetailRepository.findByFileMaster(required(master, "master 는 null 일 수 없습니다")).stream()
                .mapToInt(detail -> detail.getAtchFileSeq())
                .max()
                .orElse(0);

        // 수정은 빈 목록을 no-op으로 허용하되, 파일이 있으면 업로드와 같은 방어를 적용한다.
        validateUploadBatch(files, false);

        storeFileDetails(master, files, maxSn + 1, "general/" + atchFileSn);
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
                .atchFileSn(d.getFileMaster().getAtchFileSn())
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
     * DB 트랜잭션과 파일시스템은 하나의 원자 트랜잭션이 아니므로, 영속화 실패 시 이번 호출에서
     * 저장한 파일을 역순으로 보상 삭제한다. 그렇지 않으면 DB 롤백 뒤에도 접근 불가능한 고아 파일이 남는다.
     */
    private void storeFileDetails(
            FileMaster master,
            List<MultipartFile> files,
            int firstSequence,
            String targetPath) {
        List<String> storedFilenames = new ArrayList<>();
        int fileSequence = firstSequence;

        try {
            for (MultipartFile file : files) {
                if (file.isEmpty()) {
                    continue;
                }

                String savedFilename = storageService.store(file, targetPath);
                storedFilenames.add(savedFilename);

                FileDetail detail = FileDetail.builder()
                        .fileMaster(master)
                        .atchFileSeq(fileSequence++)
                        .fileStrgPath(targetPath)
                        .strgFileNm(savedFilename)
                        .orgnlFileNm(file.getOriginalFilename())
                        .fileEstn(StringUtils.getFilenameExtension(file.getOriginalFilename()))
                        .fileSz(file.getSize())
                        .build();

                fileDetailRepository.save(detail);
            }
        } catch (RuntimeException failure) {
            compensateStoredFiles(targetPath, storedFilenames, failure);
            throw failure;
        }
    }

    private void compensateStoredFiles(String targetPath, List<String> storedFilenames, RuntimeException failure) {
        for (int index = storedFilenames.size() - 1; index >= 0; index--) {
            try {
                storageService.delete(storedFilenames.get(index), targetPath);
            } catch (RuntimeException cleanupFailure) {
                failure.addSuppressed(cleanupFailure);
                log.error("Upload compensation failed for a stored file (path={})", targetPath, cleanupFailure);
            }
        }
    }

    /**
     * [Security] 파일 확장자 화이트리스트 검징
     */
    private void validateUploadBatch(List<MultipartFile> files, boolean requireNonEmpty) throws IOException {
        if (files == null || files.size() > MAX_FILES_PER_REQUEST) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        if (requireNonEmpty && files.isEmpty()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }

        boolean containsFile = false;
        long totalSize = 0;
        for (MultipartFile file : files) {
            if (file == null) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
            }
            if (file.isEmpty()) {
                continue;
            }
            containsFile = true;
            long size = file.getSize();
            if (size > MAX_FILE_SIZE_BYTES || totalSize > MAX_REQUEST_SIZE_BYTES - size) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
            }
            totalSize += size;

            String extension = validateFileExtension(file.getOriginalFilename());
            validateFileSignature(file, extension);
        }

        if (requireNonEmpty && !containsFile) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
    }

    private String validateFileExtension(String filename) {
        if (filename == null || filename.isBlank()
                || filename.length() > MAX_ORIGINAL_FILENAME_LENGTH
                || !filename.contains(".")) {
            throw new BusinessException(CommonErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
        String extension = StringUtils.getFilenameExtension(filename);
        if (extension == null) {
            throw new BusinessException(CommonErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
        extension = extension.toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            log.warn("Blocked file upload attempt with forbidden extension: {}", extension);
            throw new BusinessException(CommonErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
        return extension;
    }

    /**
     * 클라이언트 Content-Type은 위조 가능하므로 확장자와 파일 헤더를 직접 대조한다.
     * 이는 안티바이러스 대체가 아니라, 실행파일·다른 형식을 허용 확장자로 바꾸는 가장 흔한 우회를
     * 저장 전에 차단하는 1차 방어다.
     */
    private void validateFileSignature(MultipartFile file, String extension) throws IOException {
        byte[] header;
        try (InputStream input = file.getInputStream()) {
            header = input.readNBytes(SIGNATURE_READ_SIZE);
        }

        boolean valid = switch (extension) {
            case "jpg", "jpeg" -> startsWith(header, 0xFF, 0xD8, 0xFF);
            case "png" -> startsWith(header, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
            case "gif" -> startsWithAscii(header, "GIF87a") || startsWithAscii(header, "GIF89a");
            case "bmp" -> startsWithAscii(header, "BM");
            case "pdf" -> startsWithAscii(header, "%PDF-");
            case "doc", "xls", "ppt", "hwp" ->
                    startsWith(header, 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1);
            case "docx", "xlsx", "pptx", "zip" -> isZipSignature(header);
            case "7z" -> startsWith(header, 0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C);
            case "rar" -> startsWith(header, 0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x00)
                    || startsWith(header, 0x52, 0x61, 0x72, 0x21, 0x1A, 0x07, 0x01, 0x00);
            // 텍스트는 BOM/인코딩 다양성을 허용하되 NUL 포함 바이너리와 대표 실행 포맷은 거부한다.
            case "txt" -> !containsNullByte(header)
                    && !startsWithAscii(header, "MZ")
                    && !startsWith(header, 0x7F, 0x45, 0x4C, 0x46);
            default -> false;
        };

        if (!valid) {
            log.warn("Blocked file upload with mismatched content signature: extension={}", extension);
            throw new BusinessException(CommonErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
    }

    private boolean isZipSignature(byte[] header) {
        return startsWith(header, 0x50, 0x4B, 0x03, 0x04)
                || startsWith(header, 0x50, 0x4B, 0x05, 0x06)
                || startsWith(header, 0x50, 0x4B, 0x07, 0x08);
    }

    private boolean startsWithAscii(byte[] bytes, String signature) {
        return startsWith(bytes, signature.chars().toArray());
    }

    private boolean startsWith(byte[] bytes, int... signature) {
        if (bytes.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if ((bytes[i] & 0xFF) != signature[i]) {
                return false;
            }
        }
        return true;
    }

    private boolean containsNullByte(byte[] bytes) {
        for (byte value : bytes) {
            if (value == 0) {
                return true;
            }
        }
        return false;
    }
}
