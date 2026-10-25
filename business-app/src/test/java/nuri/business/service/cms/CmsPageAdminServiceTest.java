package nuri.business.service.cms;

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
import nuri.business.service.cms.dto.CmsPageDraftRequest;
import nuri.business.service.cms.dto.CmsPagePublishRequest;
import nuri.business.service.cms.dto.CmsPagePurgeRequest;
import nuri.business.service.cms.dto.CmsPageStateRequest;
import nuri.business.service.cms.dto.CmsPageSummaryDto;
import nuri.business.service.cms.dto.CmsRevisionPurgeRequest;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 콘텐츠 페이지의 게시 상태 전이(ADR-0039 결정 7)와 초안 판정·삭제·파기(ADR-0042). */
@ExtendWith(MockitoExtension.class)
class CmsPageAdminServiceTest {

    private static final String DOCUMENT_JSON = "{\"schemaVersion\":1,\"sections\":[{\"id\":\"a\",\"label\":\"\",\"layout\":\"one\","
            + "\"tone\":\"default\",\"spacing\":\"normal\",\"cells\":[{\"kind\":\"rich\",\"doc\":{\"type\":\"doc\",\"content\":["
            + "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"본문\"}]}]}}]}]}";
    private static final String IMAGE_DOCUMENT_JSON = "{\"schemaVersion\":1,\"sections\":[{\"id\":\"a\",\"label\":\"\","
            + "\"layout\":\"one\",\"tone\":\"default\",\"spacing\":\"normal\",\"cells\":[{\"kind\":\"image\",\"atchFileSn\":9,"
            + "\"alt\":\"그림\",\"decorative\":false,\"caption\":\"\"}]}]}";
    /** 아직 고르지 않은 이미지 칸 — 초안으로는 저장되고 게시는 막힌다(ADR-0042). */
    private static final String UNSELECTED_IMAGE_JSON = "{\"schemaVersion\":1,\"sections\":[{\"id\":\"a\",\"label\":\"\","
            + "\"layout\":\"one\",\"tone\":\"default\",\"spacing\":\"normal\",\"cells\":[{\"kind\":\"image\",\"atchFileSn\":0,"
            + "\"alt\":\"\",\"decorative\":false,\"caption\":\"\"}]}]}";

    @Mock private CmsContentRepository contentRepository;
    @Mock private CmsContentRevisionRepository revisionRepository;
    @Mock private CmsContentRevisionFileRepository revisionFileRepository;
    @Mock private CmsContentFileService contentFileService;
    @Mock private CmsHomeService homeService;
    @Spy private CmsDocumentValidator validator = new CmsDocumentValidator();
    @Mock private SensitiveAuditPort sensitiveAudit;
    @InjectMocks private CmsPageAdminService service;
    private MockedStatic<SecurityUtil> security;

    @BeforeEach
    void setUp() {
        security = mockStatic(SecurityUtil.class, CALLS_REAL_METHODS);
        security.when(() -> SecurityUtil.assertPermission(anyString())).thenAnswer(invocation -> null);
        security.when(SecurityUtil::getCurrentLoginId).thenReturn(Optional.of("editor"));
        lenient().when(revisionRepository.countByContsSn(any())).thenReturn(0L);
    }

    @AfterEach
    void tearDown() {
        security.close();
    }

    private static CmsContent content(Long contsSn, String json, Integer version) {
        CmsContent content = CmsContent.create("guide", "안내", null, json);
        ReflectionTestUtils.setField(content, "contsSn", contsSn);
        ReflectionTestUtils.setField(content, "version", version);
        return content;
    }

    private static CmsContentRevision revision(Long rvsnSn, Long contsSn, String title, String json) {
        CmsContentRevision revision = CmsContentRevision.create(contsSn, title, null, json, null, "editor", LocalDateTime.now());
        ReflectionTestUtils.setField(revision, "contsRvsnSn", rvsnSn);
        return revision;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> document(String json) {
        return tools.jackson.databind.json.JsonMapper.builder().build().readValue(json, Map.class);
    }

    @Test
    void createRejectsAPathThatIsAlreadyUsed() {
        when(contentRepository.existsByContsPathNm("guide")).thenReturn(true);
        CmsPageCreateRequest request = CmsPageCreateRequest.builder().contsPathNm("guide").contsTtl("안내")
                .document(document(DOCUMENT_JSON)).build();

        assertThatThrownBy(() -> service.createPage(request))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.DUPLICATE_RESOURCE);
        verify(contentRepository, never()).save(any());
    }

    @Test
    void createStoresTheNormalizedDraftAndClaimsItsImages() {
        when(contentRepository.save(any(CmsContent.class))).thenAnswer(invocation -> {
            CmsContent saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "contsSn", 5L);
            return saved;
        });
        CmsPageCreateRequest request = CmsPageCreateRequest.builder().contsPathNm("guide").contsTtl("  안내  ")
                .contsExpln("  ").document(document(IMAGE_DOCUMENT_JSON)).build();

        assertThat(service.createPage(request)).isEqualTo(5L);

        ArgumentCaptor<CmsContent> saved = ArgumentCaptor.forClass(CmsContent.class);
        verify(contentRepository).save(saved.capture());
        assertThat(saved.getValue().getContsTtl()).isEqualTo("안내");
        assertThat(saved.getValue().getContsExpln()).isNull();
        assertThat(saved.getValue().isPublished()).isFalse();
        verify(contentFileService).claim(eq(5L), argThat(document -> document.images().equals(Set.of(9L))));
    }

    @Test
    void saveDraftRejectsAStaleVersion() {
        when(contentRepository.findById(1L)).thenReturn(Optional.of(content(1L, DOCUMENT_JSON, 3)));
        CmsPageDraftRequest request = CmsPageDraftRequest.builder().contsPathNm("guide").contsTtl("안내")
                .document(document(DOCUMENT_JSON)).version(2).build();

        assertThatThrownBy(() -> service.saveDraft(1L, request))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
    }

    @Test
    void saveDraftKeepsThePathOncePublished() {
        when(contentRepository.findById(1L)).thenReturn(Optional.of(content(1L, DOCUMENT_JSON, 3)));
        when(revisionRepository.existsByContsSn(1L)).thenReturn(true);
        CmsPageDraftRequest request = CmsPageDraftRequest.builder().contsPathNm("renamed").contsTtl("안내")
                .document(document(DOCUMENT_JSON)).version(3).build();

        assertThatThrownBy(() -> service.saveDraft(1L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("주소는 바꿀 수 없습니다");
    }

    @Test
    void publishRejectsArchivedPages() {
        CmsContent archived = content(1L, DOCUMENT_JSON, 3);
        archived.archive();
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(archived));

        assertThatThrownBy(() -> service.publish(1L, CmsPagePublishRequest.builder().version(3).build()))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.INVALID_STATE);
        verify(revisionRepository, never()).save(any());
    }

    @Test
    void publishRejectsAnUnchangedDraft() {
        CmsContent published = content(1L, DOCUMENT_JSON, 3);
        published.publish(10L);
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(published));
        when(revisionRepository.findById(10L)).thenReturn(Optional.of(revision(10L, 1L, "안내", DOCUMENT_JSON)));

        assertThatThrownBy(() -> service.publish(1L, CmsPagePublishRequest.builder().version(3).build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("같은 내용");
        verify(revisionRepository, never()).save(any());
    }

    @Test
    void publishRequiresEveryImageToBelongToThePage() {
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(content(1L, IMAGE_DOCUMENT_JSON, 3)));
        when(contentFileService.owned(1L, Set.of(9L))).thenReturn(Map.of());

        assertThatThrownBy(() -> service.publish(1L, CmsPagePublishRequest.builder().version(3).build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("연결되지 않은 파일");
        verify(revisionRepository, never()).save(any());
    }

    @Test
    void publishAppendsAnImmutableRevisionWithItsFilesAndMovesThePointer() {
        CmsContent draft = content(1L, IMAGE_DOCUMENT_JSON, 3);
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(draft));
        CmsContentFile file = CmsContentFile.create(1L, 9L, 1, "editor", LocalDateTime.now());
        ReflectionTestUtils.setField(file, "contsFileSn", 77L);
        when(contentFileService.owned(1L, Set.of(9L))).thenReturn(Map.of(9L, file));
        when(revisionRepository.save(any(CmsContentRevision.class))).thenAnswer(invocation -> {
            CmsContentRevision saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "contsRvsnSn", 20L);
            return saved;
        });
        when(revisionRepository.findById(20L)).thenAnswer(invocation -> Optional.of(
                revision(20L, 1L, "안내", IMAGE_DOCUMENT_JSON)));

        service.publish(1L, CmsPagePublishRequest.builder().version(3).rvsnRsn("첫 게시").build());

        ArgumentCaptor<CmsContentRevision> savedRevision = ArgumentCaptor.forClass(CmsContentRevision.class);
        verify(revisionRepository).save(savedRevision.capture());
        assertThat(savedRevision.getValue().getRvsnRsn()).isEqualTo("첫 게시");
        assertThat(savedRevision.getValue().getFrstRgtrId()).isEqualTo("editor");
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Iterable<CmsContentRevisionFile>> files = ArgumentCaptor.forClass(Iterable.class);
        verify(revisionFileRepository).saveAll(files.capture());
        assertThat(files.getValue()).singleElement()
                .satisfies(saved -> assertThat(saved.getId().getContsFileSn()).isEqualTo(77L));
        assertThat(draft.getContsRvsnSn()).isEqualTo(20L);
        verify(sensitiveAudit).recordMutation("CMS_PAGE_PUBLISH", "1");
    }

    @Test
    void unpublishClearsTheHomeIntroThatPointsToThePage() {
        CmsSiteSetting home = CmsSiteSetting.create(CmsSiteSetting.HOME_INTRO);
        home.point(1L);
        when(homeService.lockHome()).thenReturn(home);
        CmsContent published = content(1L, DOCUMENT_JSON, 3);
        published.publish(10L);
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(published));

        service.unpublish(1L, CmsPageStateRequest.builder().version(3).build());

        assertThat(published.isPublished()).isFalse();
        assertThat(home.getContsSn()).isNull();
        verify(sensitiveAudit).recordMutation("CMS_PAGE_UNPUBLISH", "1");
    }

    @Test
    void unpublishLeavesAnotherHomeIntroAlone() {
        CmsSiteSetting home = CmsSiteSetting.create(CmsSiteSetting.HOME_INTRO);
        home.point(2L);
        when(homeService.lockHome()).thenReturn(home);
        CmsContent published = content(1L, DOCUMENT_JSON, 3);
        published.publish(10L);
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(published));

        service.unpublish(1L, CmsPageStateRequest.builder().version(3).build());

        assertThat(home.getContsSn()).isEqualTo(2L);
    }

    @Test
    void archiveRequiresThePageToBeUnpublishedFirst() {
        CmsContent published = content(1L, DOCUMENT_JSON, 3);
        published.publish(10L);
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(published));

        assertThatThrownBy(() -> service.archive(1L, CmsPageStateRequest.builder().version(3).build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("게시를 먼저 중지");
        assertThat(published.isArchived()).isFalse();
    }

    @Test
    void saveDraftAcceptsAnUnselectedImageAndReleasesFilesTheDraftNoLongerUses() {
        CmsContent draft = content(1L, IMAGE_DOCUMENT_JSON, 3);
        when(contentRepository.findById(1L)).thenReturn(Optional.of(draft));
        CmsPageDraftRequest request = CmsPageDraftRequest.builder().contsPathNm("guide").contsTtl("안내")
                .document(document(UNSELECTED_IMAGE_JSON)).version(3).build();

        service.saveDraft(1L, request);

        assertThat(draft.getContsDocCn()).contains("\"atchFileSn\":0");
        InOrder order = inOrder(contentFileService, contentRepository);
        order.verify(contentFileService).claim(eq(1L), any());
        order.verify(contentRepository).flush();
        order.verify(contentFileService).releaseUnused(1L, Set.of());
    }

    @Test
    void publishRejectsADraftWithAnUnfinishedCell() {
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(content(1L, UNSELECTED_IMAGE_JSON, 3)));

        assertThatThrownBy(() -> service.publish(1L, CmsPagePublishRequest.builder().version(3).build()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("이미지를 선택해 주세요")
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verify(revisionRepository, never()).save(any());
    }

    @Test
    void unpublishRecordsTheHomeReleaseAsAHomeChange() {
        CmsSiteSetting home = CmsSiteSetting.create(CmsSiteSetting.HOME_INTRO);
        home.point(1L);
        when(homeService.lockHome()).thenReturn(home);
        CmsContent published = content(1L, DOCUMENT_JSON, 3);
        published.publish(10L);
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(published));

        service.unpublish(1L, CmsPageStateRequest.builder().version(3).build());

        verify(sensitiveAudit).recordMutation("CMS_HOME_UPDATE", "NONE");
    }

    @Test
    void listSeparatesUnpublishedPagesFromDraftsNeverPublished() {
        CmsContent unpublished = content(1L, DOCUMENT_JSON, 3);
        CmsContent neverPublished = content(2L, DOCUMENT_JSON, 1);
        ReflectionTestUtils.setField(neverPublished, "contsPathNm", "draft");
        when(contentRepository.search(eq(""), eq("ACTIVE"), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(unpublished, neverPublished)));
        when(revisionRepository.findAllById(List.of())).thenReturn(List.of());
        when(revisionRepository.findPublishedOnceAmong(List.of(1L, 2L))).thenReturn(List.of(1L));

        List<CmsPageSummaryDto> rows = service.getPages(null, null, org.springframework.data.domain.PageRequest.of(0, 10))
                .getContent();

        assertThat(rows).extracting(CmsPageSummaryDto::status).containsExactly("UNPUBLISHED", "DRAFT");
        assertThat(rows).extracting(CmsPageSummaryDto::publishedAt).containsOnlyNulls();
    }

    @Test
    void listSearchesLikeWildcardsLiterally() {
        when(contentRepository.search(anyString(), eq("PENDING"), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of()));

        service.getPages(" 50%_\\a ", "PENDING", org.springframework.data.domain.PageRequest.of(0, 10));

        verify(contentRepository).search(eq("50\\%\\_\\\\a"), eq("PENDING"), any());
    }

    @Test
    void deleteRefusesAPageThatWasEverPublished() {
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(content(1L, DOCUMENT_JSON, 3)));
        when(revisionRepository.existsByContsSn(1L)).thenReturn(true);

        assertThatThrownBy(() -> service.deleteDraftPage(1L, 3))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("게시한 적이 있는 페이지는 지울 수 없습니다");
        verify(contentFileService, never()).releaseAll(any());
        verify(contentRepository, never()).delete(any());
    }

    @Test
    void deleteReleasesTheAttachmentsBeforeRemovingTheDraftPage() {
        CmsContent draft = content(1L, IMAGE_DOCUMENT_JSON, 3);
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(draft));

        service.deleteDraftPage(1L, 3);

        InOrder order = inOrder(contentFileService, contentRepository, sensitiveAudit);
        order.verify(contentFileService).releaseAll(1L);
        order.verify(contentRepository).delete(draft);
        order.verify(sensitiveAudit).recordMutation("CMS_PAGE_DELETE", "1");
    }

    @Test
    void purgeRefusesAPublishedPage() {
        CmsContent published = content(1L, DOCUMENT_JSON, 3);
        published.publish(10L);
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(published));

        assertThatThrownBy(() -> service.purgePage(1L, purge("guide")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("게시를 먼저 중지");
        verify(revisionRepository, never()).allowPurgeInCurrentTransaction();
    }

    @Test
    void purgeRequiresTheTypedPathToMatch() {
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(content(1L, DOCUMENT_JSON, 3)));

        assertThatThrownBy(() -> service.purgePage(1L, purge("guid")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("확인용 주소");
        verify(revisionRepository, never()).allowPurgeInCurrentTransaction();
    }

    @Test
    void purgeOpensTheRevisionGuardThenRemovesRevisionsFilesAndThePage() {
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(content(1L, DOCUMENT_JSON, 3)));

        service.purgePage(1L, purge(" guide "));

        InOrder order = inOrder(revisionRepository, contentFileService, contentRepository, sensitiveAudit);
        order.verify(revisionRepository).allowPurgeInCurrentTransaction();
        order.verify(revisionRepository).purgeAllRevisionFiles(1L);
        order.verify(revisionRepository).purgeAllRevisions(1L);
        order.verify(contentFileService).releaseAll(1L);
        order.verify(contentRepository).deleteById(1L);
        order.verify(sensitiveAudit).recordReferencedMutation("CMS_PAGE_PURGE", "1", "INC-2026-7");
    }

    @Test
    void purgeRevisionRefusesTheRevisionUsersSee() {
        CmsContent published = content(1L, DOCUMENT_JSON, 3);
        published.publish(10L);
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(published));
        when(revisionRepository.findByContsRvsnSnAndContsSn(10L, 1L))
                .thenReturn(Optional.of(revision(10L, 1L, "안내", DOCUMENT_JSON)));

        assertThatThrownBy(() -> service.purgeRevision(1L, 10L, revisionPurge()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("지금 사용자에게 보이는 게시본은 파기할 수 없습니다");
        verify(revisionRepository, never()).allowPurgeInCurrentTransaction();
    }

    @Test
    void purgeRevisionKeepsTheFilesTheDraftStillUses() {
        CmsContent draft = content(1L, IMAGE_DOCUMENT_JSON, 3);
        when(contentRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(draft));
        when(contentRepository.findById(1L)).thenReturn(Optional.of(draft));
        when(revisionRepository.findByContsRvsnSnAndContsSn(10L, 1L))
                .thenReturn(Optional.of(revision(10L, 1L, "안내", IMAGE_DOCUMENT_JSON)));

        service.purgeRevision(1L, 10L, revisionPurge());

        InOrder order = inOrder(revisionRepository, contentFileService, sensitiveAudit);
        order.verify(revisionRepository).allowPurgeInCurrentTransaction();
        order.verify(revisionRepository).purgeRevisionFiles(1L, 10L);
        order.verify(revisionRepository).purgeRevision(1L, 10L);
        order.verify(contentFileService).releaseUnused(1L, Set.of(9L));
        order.verify(sensitiveAudit).recordReferencedMutation("CMS_REVISION_PURGE", "1/10", "INC-2026-7");
    }

    private static CmsPagePurgeRequest purge(String path) {
        return CmsPagePurgeRequest.builder().version(3).contsPathNm(path).caseReference("INC-2026-7").build();
    }

    private static CmsRevisionPurgeRequest revisionPurge() {
        return CmsRevisionPurgeRequest.builder().version(3).caseReference("INC-2026-7").build();
    }

    @Test
    void listRejectsAnUnknownStatusFilter() {
        assertThatThrownBy(() -> service.getPages(null, "DELETED", org.springframework.data.domain.PageRequest.of(0, 10)))
                .isInstanceOf(BusinessException.class);
        verify(contentRepository, never()).search(anyString(), eq("DELETED"), any());
    }
}
