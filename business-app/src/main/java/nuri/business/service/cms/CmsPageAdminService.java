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
import nuri.business.service.cms.CmsDocumentValidator.Mode;
import nuri.business.service.cms.dto.CmsPageCreateRequest;
import nuri.business.service.cms.dto.CmsPageDetailDto;
import nuri.business.service.cms.dto.CmsPageDraftRequest;
import nuri.business.service.cms.dto.CmsPagePublishRequest;
import nuri.business.service.cms.dto.CmsPagePurgeRequest;
import nuri.business.service.cms.dto.CmsPageStateRequest;
import nuri.business.service.cms.dto.CmsPageSummaryDto;
import nuri.business.service.cms.dto.CmsRevisionDetailDto;
import nuri.business.service.cms.dto.CmsRevisionPurgeRequest;
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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 콘텐츠 페이지 관리(ADR-0039, ADR-0042). 초안 하나와 불변 게시본 이력을 다룬다.
 *
 * <p>게시 상태를 바꾸는 작업(게시·게시 중지·보관·삭제·파기)은 콘텐츠 행을 잠그고 화면이 읽은 버전을 확인한다 — 같은 요청을 다시 보내면
 * 버전이 달라 409 가 되므로 중복 게시본이 생기지 않는다. 게시 중지와 파기는 홈 설정 행을 먼저 잠근 뒤 콘텐츠 행을 잠근다(홈 지정과 같은 순서).
 *
 * <p>초안 저장은 미완성 칸을 받는 초안 판정을, 게시는 모든 칸이 완성돼야 하는 게시 판정을 쓴다(ADR-0042).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CmsPageAdminService {

    /** 한 번도 게시하지 않은 페이지. */
    static final String STATUS_DRAFT = "DRAFT";
    static final String STATUS_PUBLISHED = "PUBLISHED";
    /** 게시한 적이 있지만 지금은 게시를 중지한 페이지(ADR-0042). 주소가 고정돼 있고 메뉴가 남아 있을 수 있다. */
    static final String STATUS_UNPUBLISHED = "UNPUBLISHED";
    static final String STATUS_ARCHIVED = "ARCHIVED";
    private static final Set<String> STATUS_FILTERS = Set.of("ACTIVE", "PENDING", STATUS_DRAFT, STATUS_PUBLISHED,
            STATUS_UNPUBLISHED, STATUS_ARCHIVED);

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
        Page<CmsContent> page = contentRepository.search(likeLiteral(keyword), filter, Objects.requireNonNull(pageable));
        List<Long> revisionIds = page.getContent().stream().map(CmsContent::getContsRvsnSn)
                .filter(Objects::nonNull).toList();
        Map<Long, CmsContentRevision> revisions = revisionRepository.findAllById(revisionIds).stream()
                .collect(Collectors.toMap(CmsContentRevision::getContsRvsnSn, Function.identity()));
        Set<Long> publishedOnce = page.isEmpty() ? Set.of()
                : new HashSet<>(revisionRepository.findPublishedOnceAmong(page.getContent().stream()
                        .map(CmsContent::getContsSn).toList()));
        Long home = homeService.currentHomeContsSn();
        return page.map(content -> {
            CmsContentRevision current = revisions.get(content.getContsRvsnSn());
            return new CmsPageSummaryDto(content.getContsSn(), content.getContsPathNm(), content.getContsTtl(),
                    status(content, publishedOnce.contains(content.getContsSn())), unpublishedChanges(content, current),
                    Objects.equals(home, content.getContsSn()), content.getVersion(), content.getMdfcnDt(),
                    current == null ? null : current.getCrtDt());
        });
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
        CmsDocumentValidator.Normalized document = validator.normalize(request.getDocument(), Mode.DRAFT);
        CmsContent content = contentRepository.save(Objects.requireNonNull(CmsContent.create(
                request.getContsPathNm(), request.getContsTtl().strip(), blankToNull(request.getContsExpln()),
                document.json())));
        contentFileService.claim(content.getContsSn(), document);
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
        CmsDocumentValidator.Normalized document = validator.normalize(request.getDocument(), Mode.DRAFT);
        contentFileService.claim(contsSn, document);
        content.updateDraft(path, request.getContsTtl().strip(), blankToNull(request.getContsExpln()), document.json());
        contentRepository.flush();
        // 초안에서 뺀 첨부는 어느 게시본도 쓰지 않으면 귀속을 푼다(ADR-0042 — 미사용 업로드 정리).
        contentFileService.releaseUnused(contsSn, document.attachments());
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
        // 저장된 초안을 게시 판정으로 다시 검증한다 — 미완성 칸이 남았거나 검증 규칙이 바뀌었으면 게시하지 않는다.
        CmsDocumentValidator.Normalized document = validator.normalizeJson(content.getContsDocCn(), Mode.PUBLISH);
        Map<Long, CmsContentFile> files = contentFileService.owned(contsSn, document.attachments());
        if (files.size() != document.attachments().size()) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "페이지에 연결되지 않은 파일이 있습니다. 초안을 다시 저장해 주세요");
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
        boolean homeReleased = releaseHome(home, contsSn);
        contentRepository.flush();
        sensitiveAudit.recordMutation("CMS_PAGE_UNPUBLISH", contsSn.toString());
        if (homeReleased) {
            // 홈 지정이 함께 풀렸다 — 지정 화면에서 바꾼 것과 같은 감사 사실을 남긴다(ADR-0042).
            sensitiveAudit.recordMutation("CMS_HOME_UPDATE", "NONE");
        }
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

    /**
     * 한 번도 게시하지 않은 페이지를 지운다(ADR-0042). 사용자에게 보인 적이 없으므로 작성 권한으로 지우고, 주소와 귀속 첨부를 함께 돌려준다.
     * 게시한 적이 있는 페이지는 보관하거나 파기한다.
     */
    @Transactional
    public void deleteDraftPage(Long contsSn, Integer version) {
        SecurityUtil.assertPermission("CMS_UPDATE");
        CmsContent content = findForUpdate(contsSn);
        EntityVersions.assertCurrent(version, content.getVersion());
        if (revisionRepository.existsByContsSn(contsSn)) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE,
                    "게시한 적이 있는 페이지는 지울 수 없습니다. 보관하거나, 지워야 할 내용이 있으면 파기 권한자에게 요청해 주세요");
        }
        String path = content.getContsPathNm();
        contentFileService.releaseAll(contsSn);
        contentRepository.delete(content);
        contentRepository.flush();
        // 행이 사라지므로 감사 대상에 주소를 함께 남긴다 — 번호만으로는 어느 페이지였는지 알 수 없다(주소는 [a-z0-9-] 식별자다).
        sensitiveAudit.recordMutation("CMS_PAGE_DELETE", auditTarget(contsSn, path));
    }

    /**
     * 페이지를 파기한다(ADR-0042 — 개인정보 오게시 같은 사고 대응). 초안·모든 게시본·귀속 첨부를 되돌릴 수 없게 지운다. 게시 중인 페이지는
     * 먼저 게시를 중지해야 한다. 주소를 한 번 더 받아 맞춰 보고, 처리 근거 번호를 민감 작업 감사에 남긴다.
     */
    @Transactional
    public void purgePage(Long contsSn, CmsPagePurgeRequest request) {
        SecurityUtil.assertPermission("CMS_PURGE");
        CmsSiteSetting home = homeService.lockHome();
        CmsContent content = findForUpdate(contsSn);
        EntityVersions.assertCurrent(request.getVersion(), content.getVersion());
        if (content.isPublished()) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE, "게시 중인 페이지는 파기할 수 없습니다. 게시를 먼저 중지해 주세요");
        }
        if (!content.getContsPathNm().equals(request.getContsPathNm().strip())) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "확인용 주소가 이 페이지의 주소와 다릅니다");
        }
        // 게시 중지가 지정을 이미 풀지만, 지정 행이 남은 비정상 상태라도 FK 로 파기가 막히지 않게 먼저 비운다.
        boolean homeReleased = releaseHome(home, contsSn);
        revisionRepository.allowPurgeInCurrentTransaction();
        revisionRepository.purgeAllRevisionFiles(contsSn);
        revisionRepository.purgeAllRevisions(contsSn);
        contentFileService.releaseAll(contsSn);
        contentRepository.deleteById(contsSn);
        contentRepository.flush();
        if (homeReleased) {
            sensitiveAudit.recordMutation("CMS_HOME_UPDATE", "NONE");
        }
        sensitiveAudit.recordReferencedMutation("CMS_PAGE_PURGE", auditTarget(contsSn, content.getContsPathNm()),
                request.getCaseReference());
    }

    /**
     * 지난 게시본 하나를 파기한다(ADR-0042). 지금 보이는 게시본은 파기할 수 없다. 그 게시본만 쓰던 첨부는 초안도 쓰지 않으면 귀속을 풀고
     * 파일까지 지운다. 파기한 게시본보다 뒤의 판 번호는 하나씩 당겨진다.
     */
    @Transactional
    public CmsPageDetailDto purgeRevision(Long contsSn, Long contsRvsnSn, CmsRevisionPurgeRequest request) {
        SecurityUtil.assertPermission("CMS_PURGE");
        CmsContent content = findForUpdate(contsSn);
        EntityVersions.assertCurrent(request.getVersion(), content.getVersion());
        revisionRepository.findByContsRvsnSnAndContsSn(contsRvsnSn, contsSn)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "게시 이력을 찾을 수 없습니다"));
        if (contsRvsnSn.equals(content.getContsRvsnSn())) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE,
                    "지금 사용자에게 보이는 게시본은 파기할 수 없습니다. 고친 본을 다시 게시하거나 게시를 중지한 뒤 파기해 주세요");
        }
        // 마지막 게시본까지 지우면 '한 번도 게시하지 않은 초안' 으로 보여 주소 잠금이 풀리고 작성 권한 삭제가 열린다 — 페이지 파기로 보낸다.
        if (revisionRepository.countByContsSn(contsSn) <= 1) {
            throw new BusinessException(CommonErrorCode.INVALID_STATE,
                    "남은 게시본이 하나뿐입니다. 이 게시본까지 지워야 하면 페이지 파기를 써 주세요");
        }
        Set<Long> draftAttachments = validator.normalizeJson(content.getContsDocCn(), Mode.DRAFT).attachments();
        // 버전을 올린다 — 파기한 본을 불러온 편집기가 409 없이 그 내용을 초안으로 되살려 저장하지 않게 한다.
        content.markHistoryChanged(LocalDateTime.now());
        revisionRepository.allowPurgeInCurrentTransaction();
        revisionRepository.purgeRevisionFiles(contsSn, contsRvsnSn);
        revisionRepository.purgeRevision(contsSn, contsRvsnSn);
        contentFileService.releaseUnused(contsSn, draftAttachments);
        sensitiveAudit.recordReferencedMutation("CMS_REVISION_PURGE", contsSn + "/" + contsRvsnSn,
                request.getCaseReference());
        return detail(find(contsSn));
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
                content.getContsExpln(), validator.toResponse(content.getContsDocCn()), status(content, revisionCount > 0),
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

    private boolean releaseHome(CmsSiteSetting home, Long contsSn) {
        if (home != null && contsSn.equals(home.getContsSn())) {
            home.point(null);
            return true;
        }
        return false;
    }

    private static String status(CmsContent content, boolean publishedOnce) {
        if (content.isArchived()) {
            return STATUS_ARCHIVED;
        }
        if (content.isPublished()) {
            return STATUS_PUBLISHED;
        }
        return publishedOnce ? STATUS_UNPUBLISHED : STATUS_DRAFT;
    }

    /** LIKE 의 % · _ · \ 를 글자 그대로 찾게 막는다(저장소 질의가 ESCAPE '\' 를 쓴다). */
    static String likeLiteral(String keyword) {
        String stripped = keyword == null ? "" : keyword.strip();
        return stripped.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    /** 지워지는 페이지의 감사 대상 — 번호와 주소. */
    private static String auditTarget(Long contsSn, String contsPathNm) {
        return contsSn + ":" + contsPathNm;
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
