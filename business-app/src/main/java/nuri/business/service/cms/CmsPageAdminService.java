package nuri.business.service.cms;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.cms.CmsContent;
import nuri.business.domain.cms.CmsContentFile;
import nuri.business.domain.cms.CmsContentRepository;
import nuri.business.domain.cms.CmsContentRevision;
import nuri.business.domain.cms.CmsContentRevisionFile;
import nuri.business.domain.cms.CmsContentRevisionFileRepository;
import nuri.business.domain.cms.CmsContentRevisionRepository;
import nuri.business.domain.cms.CmsSiteSetting;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.cms.dto.CmsPageCreateRequest;
import nuri.business.service.cms.dto.CmsPageDetailDto;
import nuri.business.service.cms.dto.CmsPageDraftRequest;
import nuri.business.service.cms.dto.CmsPagePublishRequest;
import nuri.business.service.cms.dto.CmsPageStateRequest;
import nuri.business.service.cms.dto.CmsPageSummaryDto;
import nuri.business.service.cms.dto.CmsRevisionDetailDto;
import nuri.business.service.cms.dto.CmsRevisionSummaryDto;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.util.EntityVersions;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 콘텐츠 페이지 관리(ADR-0039). 초안 하나와 불변 게시본 이력을 다룬다.
 *
 * <p>게시 상태를 바꾸는 작업(게시·게시 중지·보관)은 콘텐츠 행을 잠그고 화면이 읽은 버전을 확인한다 — 같은 요청을 다시 보내면 버전이
 * 달라 409 가 되므로 중복 게시본이 생기지 않는다. 게시 중지는 홈 설정 행을 먼저 잠근 뒤 콘텐츠 행을 잠근다(홈 지정과 같은 순서).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CmsPageAdminService {

    static final String STATUS_DRAFT = "DRAFT";
    static final String STATUS_PUBLISHED = "PUBLISHED";
    static final String STATUS_ARCHIVED = "ARCHIVED";
    private static final Set<String> STATUS_FILTERS = Set.of("ACTIVE", STATUS_DRAFT, STATUS_PUBLISHED, STATUS_ARCHIVED);

    private final CmsContentRepository contentRepository;
    private final CmsContentRevisionRepository revisionRepository;
    private final CmsContentRevisionFileRepository revisionFileRepository;
    private final CmsContentFileService contentFileService;
    private final CmsHomeService homeService;
    private final CmsDocumentValidator validator;
    private final SensitiveAuditPort sensitiveAudit;

    public Page<CmsPageSummaryDto> getPages(String keyword, String status, Pageable pageable) {
        String filter = status == null || status.isBlank() ? "ACTIVE" : status;
        if (!STATUS_FILTERS.contains(filter)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "상태 조건이 올바르지 않습니다");
        }
        Page<CmsContent> page = contentRepository.search(keyword == null ? "" : keyword.strip(), filter,
                Objects.requireNonNull(pageable));
        List<Long> revisionIds = page.getContent().stream().map(CmsContent::getContsRvsnSn)
                .filter(Objects::nonNull).toList();
        Map<Long, CmsContentRevision> revisions = revisionRepository.findAllById(revisionIds).stream()
                .collect(Collectors.toMap(CmsContentRevision::getContsRvsnSn, Function.identity()));
        Long home = homeService.currentHomeContsSn();
        return page.map(content -> new CmsPageSummaryDto(content.getContsSn(), content.getContsPathNm(),
                content.getContsTtl(), status(content),
                unpublishedChanges(content, revisions.get(content.getContsRvsnSn())),
                Objects.equals(home, content.getContsSn()), content.getVersion(), content.getMdfcnDt()));
    }

    public CmsPageDetailDto getPage(Long contsSn) {
        return detail(find(contsSn));
    }

    @Transactional
    public Long createPage(CmsPageCreateRequest request) {
        SecurityUtil.assertPermission("CMS_UPDATE");
        if (contentRepository.existsByContsPathNm(request.getContsPathNm())) {
            throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE, "이미 쓰는 주소입니다. 다른 주소를 입력해 주세요");
        }
        CmsDocumentValidator.Normalized document = validator.normalize(request.getDocument());
        CmsContent content = contentRepository.save(Objects.requireNonNull(CmsContent.create(
                request.getContsPathNm(), request.getContsTtl().strip(), blankToNull(request.getContsExpln()),
                document.json())));
        contentFileService.claim(content.getContsSn(), document.images());
        return content.getContsSn();
    }

    @Transactional
    public CmsPageDetailDto saveDraft(Long contsSn, CmsPageDraftRequest request) {
        SecurityUtil.assertPermission("CMS_UPDATE");
        CmsContent content = find(contsSn);
        EntityVersions.assertCurrent(request.getVersion(), content.getVersion());
        if (content.isArchived()) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "보관한 페이지는 고칠 수 없습니다. 보관을 먼저 해제해 주세요");
        }
        String path = request.getContsPathNm();
        if (!path.equals(content.getContsPathNm())) {
            if (revisionRepository.existsByContsSn(contsSn)) {
                throw new BusinessException(CommonErrorCode.INVALID_STATE, "게시한 적이 있는 페이지의 주소는 바꿀 수 없습니다");
            }
            if (contentRepository.existsByContsPathNm(path)) {
                throw new BusinessException(CommonErrorCode.DUPLICATE_RESOURCE, "이미 쓰는 주소입니다. 다른 주소를 입력해 주세요");
            }
        }
        CmsDocumentValidator.Normalized document = validator.normalize(request.getDocument());
        contentFileService.claim(contsSn, document.images());
        content.updateDraft(path, request.getContsTtl().strip(), blankToNull(request.getContsExpln()), document.json());
        contentRepository.flush();
        return detail(content);
    }

    @Transactional
    public CmsPageDetailDto publish(Long contsSn, CmsPagePublishRequest request) {
        SecurityUtil.assertPermission("CMS_PUBLISH");
        CmsContent content = findForUpdate(contsSn);
        EntityVersions.assertCurrent(request.getVersion(), content.getVersion());
        if (content.isArchived()) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "보관한 페이지는 게시할 수 없습니다. 보관을 먼저 해제해 주세요");
        }
        // 저장된 초안을 지금 규칙으로 다시 검증한다 — 검증 규칙이 바뀌었어도 통과한 문서만 사용자에게 보인다.
        CmsDocumentValidator.Normalized document = validator.normalizeJson(content.getContsDocCn());
        Map<Long, CmsContentFile> files = contentFileService.owned(contsSn, document.images());
        if (files.size() != document.images().size()) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "페이지에 연결되지 않은 이미지가 있습니다. 초안을 다시 저장해 주세요");
        }
        if (content.isPublished()) {
            CmsContentRevision current = revisionRepository.findById(content.getContsRvsnSn()).orElseThrow();
            if (!unpublishedChanges(content, current)) {
                throw new BusinessException(CommonErrorCode.INVALID_STATE, "게시본과 같은 내용입니다. 바꾼 뒤 게시해 주세요");
            }
        }
        String loginId = SecurityUtil.getCurrentLoginId().orElse(null);
        LocalDateTime now = LocalDateTime.now();
        CmsContentRevision revision = revisionRepository.save(Objects.requireNonNull(CmsContentRevision.create(contsSn,
                content.getContsTtl(), content.getContsExpln(), document.json(), blankToNull(request.getRvsnRsn()),
                loginId, now)));
        List<CmsContentRevisionFile> revisionFiles = new ArrayList<>();
        for (CmsContentFile file : files.values()) {
            revisionFiles.add(CmsContentRevisionFile.create(revision.getContsRvsnSn(), file.getContsFileSn(), contsSn,
                    loginId, now));
        }
        revisionFileRepository.saveAll(revisionFiles);
        content.publish(revision.getContsRvsnSn());
        contentRepository.flush();
        sensitiveAudit.recordMutation("CMS_PAGE_PUBLISH", contsSn.toString());
        return detail(content);
    }

    @Transactional
    public CmsPageDetailDto unpublish(Long contsSn, CmsPageStateRequest request) {
        SecurityUtil.assertPermission("CMS_PUBLISH");
        // 홈 설정 행 → 콘텐츠 행 순서로 잠근다(홈 지정과 같은 순서 — 게시 중지된 페이지가 홈으로 남는 경합을 막는다).
        CmsSiteSetting home = homeService.lockHome();
        CmsContent content = findForUpdate(contsSn);
        EntityVersions.assertCurrent(request.getVersion(), content.getVersion());
        if (!content.isPublished()) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "게시 중인 페이지가 아닙니다");
        }
        content.unpublish();
        if (home != null && contsSn.equals(home.getContsSn())) {
            home.point(null);
        }
        contentRepository.flush();
        sensitiveAudit.recordMutation("CMS_PAGE_UNPUBLISH", contsSn.toString());
        return detail(content);
    }

    @Transactional
    public CmsPageDetailDto archive(Long contsSn, CmsPageStateRequest request) {
        SecurityUtil.assertPermission("CMS_PUBLISH");
        CmsContent content = findForUpdate(contsSn);
        EntityVersions.assertCurrent(request.getVersion(), content.getVersion());
        if (content.isPublished()) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "게시 중인 페이지는 보관할 수 없습니다. 게시를 먼저 중지해 주세요");
        }
        if (content.isArchived()) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "이미 보관한 페이지입니다");
        }
        content.archive();
        contentRepository.flush();
        return detail(content);
    }

    @Transactional
    public CmsPageDetailDto unarchive(Long contsSn, CmsPageStateRequest request) {
        SecurityUtil.assertPermission("CMS_PUBLISH");
        CmsContent content = findForUpdate(contsSn);
        EntityVersions.assertCurrent(request.getVersion(), content.getVersion());
        if (!content.isArchived()) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "보관한 페이지가 아닙니다");
        }
        content.unarchive();
        contentRepository.flush();
        return detail(content);
    }

    public List<CmsRevisionSummaryDto> getRevisions(Long contsSn) {
        CmsContent content = find(contsSn);
        List<CmsContentRevision> revisions = revisionRepository.findByContsSnOrderByContsRvsnSnDesc(contsSn);
        List<CmsRevisionSummaryDto> result = new ArrayList<>(revisions.size());
        for (int i = 0; i < revisions.size(); i++) {
            result.add(summary(revisions.get(i), revisions.size() - i, content.getContsRvsnSn()));
        }
        return result;
    }

    public CmsRevisionDetailDto getRevision(Long contsSn, Long contsRvsnSn) {
        CmsContentRevision revision = revisionRepository.findByContsRvsnSnAndContsSn(contsRvsnSn, contsSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "게시 이력을 찾을 수 없습니다"));
        return new CmsRevisionDetailDto(revision.getContsRvsnSn(), number(revision), revision.getContsTtl(),
                revision.getContsExpln(), validator.toResponse(revision.getContsDocCn()), revision.getRvsnRsn(),
                revision.getFrstRgtrId(), revision.getCrtDt());
    }

    private CmsPageDetailDto detail(CmsContent content) {
        CmsContentRevision current = content.isPublished()
                ? revisionRepository.findById(content.getContsRvsnSn()).orElse(null) : null;
        long revisionCount = revisionRepository.countByContsSn(content.getContsSn());
        return new CmsPageDetailDto(content.getContsSn(), content.getContsPathNm(), content.getContsTtl(),
                content.getContsExpln(), validator.toResponse(content.getContsDocCn()), status(content),
                unpublishedChanges(content, current), Objects.equals(homeService.currentHomeContsSn(), content.getContsSn()),
                revisionCount > 0, content.getVersion(),
                current == null ? null : summary(current, number(current), content.getContsRvsnSn()),
                revisionCount, content.getMdfcnDt());
    }

    private CmsRevisionSummaryDto summary(CmsContentRevision revision, long number, Long currentRevisionSn) {
        return new CmsRevisionSummaryDto(revision.getContsRvsnSn(), number, revision.getContsTtl(), revision.getRvsnRsn(),
                revision.getFrstRgtrId(), revision.getCrtDt(), revision.getContsRvsnSn().equals(currentRevisionSn));
    }

    private long number(CmsContentRevision revision) {
        return revisionRepository.countByContsSnAndContsRvsnSnLessThanEqual(revision.getContsSn(), revision.getContsRvsnSn());
    }

    private boolean unpublishedChanges(CmsContent content, CmsContentRevision current) {
        if (current == null) {
            return false;
        }
        return !Objects.equals(content.getContsTtl(), current.getContsTtl())
                || !Objects.equals(content.getContsExpln(), current.getContsExpln())
                || !validator.sameDocument(content.getContsDocCn(), current.getContsDocCn());
    }

    private static String status(CmsContent content) {
        if (content.isArchived()) {
            return STATUS_ARCHIVED;
        }
        return content.isPublished() ? STATUS_PUBLISHED : STATUS_DRAFT;
    }

    private CmsContent find(Long contsSn) {
        return contentRepository.findById(Objects.requireNonNull(contsSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "콘텐츠 페이지를 찾을 수 없습니다"));
    }

    private CmsContent findForUpdate(Long contsSn) {
        return contentRepository.findByIdForUpdate(Objects.requireNonNull(contsSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "콘텐츠 페이지를 찾을 수 없습니다"));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
