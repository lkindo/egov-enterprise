package nuri.business.service.cms;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.cms.CmsContentFile;
import nuri.business.domain.cms.CmsContentFileRepository;
import nuri.business.domain.cms.CmsContentRevisionFileRepository;
import nuri.business.domain.file.FileDetail;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.file.FileService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 콘텐츠 페이지가 쓰는 첨부의 귀속(ADR-0039 결정 8, ADR-0042).
 *
 * <p>문서의 이미지 칸과 내려받기 파일 칸은 기존 업로드 API 로 올린 첨부를 가리킨다. 초안을 저장할 때 아직 이 페이지에 속하지 않은 첨부를
 * 귀속시킨다: 원 업로더만(첨부 할당 정책), 다른 페이지에 속하지 않은 것만, 파일이 하나뿐인 첨부만, 칸 종류가 받는 확장자만. 첨부 열람은
 * 마스터 단위로 판정되므로 파일 하나 규칙이 다른 파일을 함께 공개하는 일을 막는다 — 마스터를 잠근 뒤 세어 같은 마스터에 파일을 더하는
 * 요청과 경합하지 않는다. 귀속 행의 FK 가 일반 파일 API 의 삭제를 막는다.
 *
 * <p>귀속을 푸는 길은 둘이다(ADR-0042). 초안 저장은 초안에도 어느 게시본에도 쓰이지 않는 첨부의 귀속을 풀고, 페이지 삭제·파기는 페이지의
 * 귀속을 모두 푼다. 푼 첨부는 다른 업무 참조가 남지 않았을 때만 파일까지 지운다(파일 서비스가 판정한다). 참조를 확인하지 못하면
 * (조회 실패) 작업 전체가 되돌아간다 — 저장·삭제·파기가 실패로 끝나고 아무것도 지우지 않는다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CmsContentFileService {

    /** 이미지 칸이 받는 확장자. SVG 는 문서 안에서 스크립트를 실을 수 있어, bmp 는 화면이 그리지 않는 형식이라 받지 않는다. */
    static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif");
    /** 내려받기 파일 칸이 받는 확장자. 일반 업로드가 받는 문서 형식이고, 안을 볼 수 없는 압축 파일은 받지 않는다. */
    static final Set<String> FILE_EXTENSIONS = Set.of("pdf", "hwp", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt");

    private final CmsContentFileRepository contentFileRepository;
    private final CmsContentRevisionFileRepository revisionFileRepository;
    private final FileMasterRepository fileMasterRepository;
    private final FileDetailRepository fileDetailRepository;
    private final AttachmentAssignmentPolicy attachmentAssignmentPolicy;
    private final FileService fileService;

    private static final String IMAGE_EXTENSION_MESSAGE = "이미지 파일(png·jpg·gif)만 쓸 수 있습니다";
    private static final String FILE_EXTENSION_MESSAGE =
            "내려받기 파일은 pdf·hwp·doc·docx·xls·xlsx·ppt·pptx·txt 만 쓸 수 있습니다";

    /** 문서가 가리키는 첨부 가운데 아직 이 페이지에 속하지 않은 것을 귀속시킨다. 칸 종류마다 받는 형식이 다르다. */
    @Transactional
    public void claim(Long contsSn, CmsDocumentValidator.Normalized document) {
        Map<Long, CmsContentFile> owned = owned(contsSn, document.attachments());
        String loginId = SecurityUtil.getCurrentLoginId().orElse(null);
        for (Long atchFileSn : document.attachments()) {
            boolean image = document.images().contains(atchFileSn);
            Set<String> extensions = image ? IMAGE_EXTENSIONS : FILE_EXTENSIONS;
            String extensionMessage = image ? IMAGE_EXTENSION_MESSAGE : FILE_EXTENSION_MESSAGE;
            CmsContentFile existing = owned.get(atchFileSn);
            if (existing != null) {
                // 이미 귀속된 첨부라도 칸 종류가 받는 형식이어야 한다 — 이미지로 귀속된 파일을 내려받기 칸으로 옮겨도 같은 규칙을 본다.
                assertExtension(fileDetailRepository.findByFileMasterAtchFileSnAndAtchFileSeq(atchFileSn,
                        existing.getAtchFileSeq()).orElse(null), extensions, extensionMessage);
                continue;
            }
            if (contentFileRepository.findByAtchFileSn(atchFileSn).isPresent()) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                        "다른 페이지에 쓰인 파일입니다. 파일을 새로 올려 주세요");
            }
            FileMaster master = fileMasterRepository.findByIdForUpdate(atchFileSn)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "파일을 찾을 수 없습니다"));
            attachmentAssignmentPolicy.assertAssignable(atchFileSn);
            List<FileDetail> details = fileDetailRepository.findByFileMaster(master);
            if (details.size() != 1) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "파일은 하나씩 올려 주세요");
            }
            FileDetail detail = details.get(0);
            assertExtension(detail, extensions, extensionMessage);
            contentFileRepository.save(CmsContentFile.create(contsSn, atchFileSn, detail.getAtchFileSeq(),
                    loginId, LocalDateTime.now()));
        }
    }

    private static void assertExtension(FileDetail detail, Set<String> extensions, String message) {
        String extension = detail == null || detail.getFileEstn() == null ? "" : detail.getFileEstn().toLowerCase(Locale.ROOT);
        if (!extensions.contains(extension)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, message);
        }
    }

    /** 이 페이지에 이미 속한 첨부. 게시는 문서의 모든 첨부가 여기 있어야 한다. */
    public Map<Long, CmsContentFile> owned(Long contsSn, Set<Long> atchFileSns) {
        if (atchFileSns.isEmpty()) {
            return new HashMap<>();
        }
        return contentFileRepository.findByContsSnAndAtchFileSnIn(contsSn, atchFileSns).stream()
                .collect(Collectors.toMap(CmsContentFile::getAtchFileSn, Function.identity()));
    }

    /**
     * 초안에도 어느 게시본에도 쓰이지 않는 첨부의 귀속을 푼다(초안 저장 직후). 게시본이 쓰는 첨부는 게시본이 지워지지 않는 한 남는다 —
     * 지난 게시본을 편집기로 불러와도 그 이미지가 그대로 열린다. 귀속을 푼 첨부는 다른 업무 참조가 없으면 파일까지 지운다.
     *
     * @return 귀속을 푼 첨부 수
     */
    @Transactional
    public int releaseUnused(Long contsSn, Set<Long> keep) {
        List<CmsContentFile> unused = contentFileRepository.findByContsSn(contsSn).stream()
                .filter(file -> !keep.contains(file.getAtchFileSn()))
                .filter(file -> !revisionFileRepository.existsByIdContsFileSn(file.getContsFileSn()))
                .toList();
        release(unused);
        return unused.size();
    }

    /** 페이지의 귀속을 모두 푼다(페이지 삭제·파기 — 게시본 첨부 집합을 먼저 지운 뒤 부른다). */
    @Transactional
    public void releaseAll(Long contsSn) {
        release(contentFileRepository.findByContsSn(contsSn));
    }

    private void release(List<CmsContentFile> files) {
        if (files.isEmpty()) {
            return;
        }
        contentFileRepository.deleteAll(files);
        // 파일 서비스는 JDBC 로 남은 참조를 센다 — 귀속 행 삭제를 먼저 내보내야 이 페이지의 참조가 남은 것으로 읽히지 않는다.
        contentFileRepository.flush();
        for (CmsContentFile file : files) {
            fileService.discardUnreferencedAttachment(file.getAtchFileSn());
        }
    }
}
