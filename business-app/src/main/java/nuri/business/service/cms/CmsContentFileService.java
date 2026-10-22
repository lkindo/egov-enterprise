package nuri.business.service.cms;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.cms.CmsContentFile;
import nuri.business.domain.cms.CmsContentFileRepository;
import nuri.business.domain.file.FileDetail;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.domain.file.FileMaster;
import nuri.business.domain.file.FileMasterRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.file.AttachmentAssignmentPolicy;
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
 * 콘텐츠 페이지가 쓰는 이미지 첨부의 귀속(ADR-0039 결정 8).
 *
 * <p>문서의 이미지 칸은 기존 업로드 API 로 올린 첨부를 가리킨다. 초안을 저장할 때 아직 이 페이지에 속하지 않은 첨부를 귀속시킨다:
 * 원 업로더만(첨부 할당 정책), 다른 페이지에 속하지 않은 것만, 파일이 하나뿐인 첨부만, 이미지 확장자만. 첨부 열람은 마스터 단위로
 * 판정되므로 파일 하나 규칙이 다른 파일을 함께 공개하는 일을 막는다 — 마스터를 잠근 뒤 세어 같은 마스터에 파일을 더하는 요청과
 * 경합하지 않는다. 귀속 행의 FK 가 일반 파일 API 의 삭제를 막는다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CmsContentFileService {

    /** SVG 는 받지 않는다 — 문서 안에서 스크립트를 실을 수 있다. */
    static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif", "webp");

    private final CmsContentFileRepository contentFileRepository;
    private final FileMasterRepository fileMasterRepository;
    private final FileDetailRepository fileDetailRepository;
    private final AttachmentAssignmentPolicy attachmentAssignmentPolicy;

    /** 문서가 가리키는 첨부 가운데 아직 이 페이지에 속하지 않은 것을 귀속시킨다. */
    @Transactional
    public void claim(Long contsSn, Set<Long> atchFileSns) {
        if (atchFileSns.isEmpty()) {
            return;
        }
        Map<Long, CmsContentFile> owned = owned(contsSn, atchFileSns);
        String loginId = SecurityUtil.getCurrentLoginId().orElse(null);
        for (Long atchFileSn : atchFileSns) {
            if (owned.containsKey(atchFileSn)) {
                continue;
            }
            if (contentFileRepository.findByAtchFileSn(atchFileSn).isPresent()) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                        "다른 페이지에 쓰인 이미지입니다. 이미지를 새로 올려 주세요");
            }
            FileMaster master = fileMasterRepository.findByIdForUpdate(atchFileSn)
                    .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "이미지를 찾을 수 없습니다"));
            attachmentAssignmentPolicy.assertAssignable(atchFileSn);
            List<FileDetail> details = fileDetailRepository.findByFileMaster(master);
            if (details.size() != 1) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "이미지는 파일 하나씩 올려 주세요");
            }
            FileDetail detail = details.get(0);
            String extension = detail.getFileEstn() == null ? "" : detail.getFileEstn().toLowerCase(Locale.ROOT);
            if (!IMAGE_EXTENSIONS.contains(extension)) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                        "이미지 파일(png·jpg·gif·webp)만 쓸 수 있습니다");
            }
            contentFileRepository.save(CmsContentFile.create(contsSn, atchFileSn, detail.getAtchFileSeq(),
                    loginId, LocalDateTime.now()));
        }
    }

    /** 이 페이지에 이미 속한 첨부. 게시는 문서의 모든 이미지가 여기 있어야 한다. */
    public Map<Long, CmsContentFile> owned(Long contsSn, Set<Long> atchFileSns) {
        if (atchFileSns.isEmpty()) {
            return new HashMap<>();
        }
        return contentFileRepository.findByContsSnAndAtchFileSnIn(contsSn, atchFileSns).stream()
                .collect(Collectors.toMap(CmsContentFile::getAtchFileSn, Function.identity()));
    }
}
