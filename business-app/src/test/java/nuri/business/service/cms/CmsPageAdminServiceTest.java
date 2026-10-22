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
import nuri.business.service.cms.dto.CmsPageStateRequest;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 콘텐츠 페이지의 게시 상태 전이(ADR-0039 결정 7). */
@ExtendWith(MockitoExtension.class)
class CmsPageAdminServiceTest {

    private static final String DOCUMENT_JSON = "{\"schemaVersion\":1,\"sections\":[{\"id\":\"a\",\"label\":\"\",\"layout\":\"one\","
            + "\"tone\":\"default\",\"spacing\":\"normal\",\"cells\":[{\"kind\":\"rich\",\"doc\":{\"type\":\"doc\",\"content\":["
            + "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"본문\"}]}]}}]}]}";
    private static final String IMAGE_DOCUMENT_JSON = "{\"schemaVersion\":1,\"sections\":[{\"id\":\"a\",\"label\":\"\","
            + "\"layout\":\"one\",\"tone\":\"default\",\"spacing\":\"normal\",\"cells\":[{\"kind\":\"image\",\"atchFileSn\":9,"
            + "\"alt\":\"그림\",\"decorative\":false,\"caption\":\"\"}]}]}";

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
        verify(contentFileService).claim(5L, Set.of(9L));
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
                .hasMessageContaining("연결되지 않은 이미지");
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
    void listRejectsAnUnknownStatusFilter() {
        assertThatThrownBy(() -> service.getPages(null, "DELETED", org.springframework.data.domain.PageRequest.of(0, 10)))
                .isInstanceOf(BusinessException.class);
        verify(contentRepository, never()).search(anyString(), eq("DELETED"), any());
    }
}
