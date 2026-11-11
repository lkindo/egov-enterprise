package nuri.business.service.cms;

import nuri.business.domain.cms.CmsContent;
import nuri.business.domain.cms.CmsContentRepository;
import nuri.business.domain.cms.CmsContentRevision;
import nuri.business.domain.cms.CmsContentRevisionRepository;
import nuri.business.domain.cms.CmsSiteSetting;
import nuri.business.domain.cms.CmsSiteSettingRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.cms.dto.CmsHomeDto;
import nuri.business.service.cms.dto.CmsHomeUpdateRequest;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 업무 홈 소개 지정 서비스 단위 테스트(ADR-0039 결정 2, ADR-0042). */
@ExtendWith(MockitoExtension.class)
class CmsHomeServiceTest {

    private static final String DOC_JSON = "{\"schemaVersion\":1,\"sections\":[]}";

    @Mock private CmsSiteSettingRepository siteSettingRepository;
    @Mock private CmsContentRepository contentRepository;
    @Mock private CmsContentRevisionRepository revisionRepository;
    @Mock private SensitiveAuditPort sensitiveAudit;
    @InjectMocks private CmsHomeService service;

    private MockedStatic<SecurityUtil> security;

    @BeforeEach
    void setUp() {
        security = mockStatic(SecurityUtil.class);
        security.when(() -> SecurityUtil.assertPermission("CMS_HOME_UPDATE")).thenAnswer(invocation -> null);
    }

    @AfterEach
    void tearDown() {
        security.close();
    }

    private static CmsSiteSetting setting(Long contsSn, Integer version) {
        CmsSiteSetting setting = CmsSiteSetting.create(CmsSiteSetting.HOME_INTRO);
        setting.point(contsSn);
        ReflectionTestUtils.setField(setting, "version", version);
        return setting;
    }

    private static CmsContent content(Long contsSn, String slug, String draftTitle) {
        CmsContent content = CmsContent.create(slug, draftTitle, null, DOC_JSON);
        ReflectionTestUtils.setField(content, "contsSn", contsSn);
        return content;
    }

    private static CmsContentRevision revision(Long rvsnSn, Long contsSn, String publishedTitle) {
        CmsContentRevision revision = CmsContentRevision.create(
                contsSn, publishedTitle, null, DOC_JSON, null, "editor", LocalDateTime.of(2026, 11, 11, 12, 0));
        ReflectionTestUtils.setField(revision, "contsRvsnSn", rvsnSn);
        return revision;
    }

    @Test
    void getHomeReturnsEmptyDefaultWhenSettingRowDoesNotExist() {
        when(siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.empty());

        CmsHomeDto home = service.getHome();

        assertThat(home).isEqualTo(new CmsHomeDto(null, null, null, 0));
        verify(contentRepository, never()).findById(any());
    }

    @Test
    void getHomeReturnsVersionWithoutQueryingContentWhenContsSnIsNull() {
        when(siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.of(setting(null, 4)));

        CmsHomeDto home = service.getHome();

        assertThat(home).isEqualTo(new CmsHomeDto(null, null, null, 4));
        verify(contentRepository, never()).findById(any());
    }

    @Test
    void getHomeHandlesMissingContentGracefully() {
        when(siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.of(setting(9L, 2)));
        when(contentRepository.findById(9L)).thenReturn(Optional.empty());

        CmsHomeDto home = service.getHome();

        assertThat(home).isEqualTo(new CmsHomeDto(9L, null, null, 2));
    }

    @Test
    void getHomeUsesPublishedRevisionTitleRatherThanUnsavedDraftTitle() {
        CmsContent published = content(7L, "welcome", "초안 제목");
        published.publish(21L);
        when(siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.of(setting(7L, 5)));
        when(contentRepository.findById(7L)).thenReturn(Optional.of(published));
        when(revisionRepository.findById(21L)).thenReturn(Optional.of(revision(21L, 7L, "게시본 제목")));

        CmsHomeDto home = service.getHome();

        assertThat(home).isEqualTo(new CmsHomeDto(7L, "welcome", "게시본 제목", 5));
    }

    @Test
    void getHomeFallsBackToDraftTitleWhenUnpublishedOrRevisionMissing() {
        CmsContent unpublished = content(8L, "intro", "미게시 제목");
        when(siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.of(setting(8L, 1)));
        when(contentRepository.findById(8L)).thenReturn(Optional.of(unpublished));

        assertThat(service.getHome()).isEqualTo(new CmsHomeDto(8L, "intro", "미게시 제목", 1));

        unpublished.publish(99L);
        when(revisionRepository.findById(99L)).thenReturn(Optional.empty());
        assertThat(service.getHome()).isEqualTo(new CmsHomeDto(8L, "intro", "미게시 제목", 1));
    }

    @Test
    void updateHomeCreatesSettingWhenMissingAndPointsToPublishedContent() {
        CmsContent published = content(11L, "guide", "초안");
        published.publish(30L);
        when(siteSettingRepository.findByStngCdForUpdate(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.empty());
        when(siteSettingRepository.save(any(CmsSiteSetting.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(contentRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(published));
        when(siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO))
                .thenAnswer(invocation -> Optional.of(setting(11L, 0)));
        when(contentRepository.findById(11L)).thenReturn(Optional.of(published));
        when(revisionRepository.findById(30L)).thenReturn(Optional.of(revision(30L, 11L, "안내 게시본")));

        CmsHomeDto updated = service.updateHome(CmsHomeUpdateRequest.builder().contsSn(11L).version(0).build());

        assertThat(updated).isEqualTo(new CmsHomeDto(11L, "guide", "안내 게시본", 0));
        security.verify(() -> SecurityUtil.assertPermission("CMS_HOME_UPDATE"));
        InOrder order = inOrder(siteSettingRepository, sensitiveAudit);
        order.verify(siteSettingRepository).save(any(CmsSiteSetting.class));
        order.verify(siteSettingRepository).flush();
        order.verify(sensitiveAudit).recordMutation("CMS_HOME_UPDATE", "11");
    }

    @Test
    void updateHomeClearsPointerAndRecordsNoneAuditTarget() {
        CmsSiteSetting existing = setting(11L, 3);
        when(siteSettingRepository.findByStngCdForUpdate(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.of(existing));
        when(siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.of(existing));

        CmsHomeDto cleared = service.updateHome(CmsHomeUpdateRequest.builder().contsSn(null).version(3).build());

        assertThat(existing.getContsSn()).isNull();
        assertThat(cleared).isEqualTo(new CmsHomeDto(null, null, null, 3));
        verify(contentRepository, never()).findByIdForUpdate(any());
        verify(sensitiveAudit).recordMutation("CMS_HOME_UPDATE", "NONE");
    }

    @Test
    void updateHomeRejectsStaleVersionMissingContentUnpublishedAndArchivedContent() {
        CmsSiteSetting existing = setting(null, 2);
        when(siteSettingRepository.findByStngCdForUpdate(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.updateHome(CmsHomeUpdateRequest.builder().contsSn(5L).version(1).build()))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);

        when(contentRepository.findByIdForUpdate(404L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.updateHome(CmsHomeUpdateRequest.builder().contsSn(404L).version(2).build()))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);

        CmsContent draft = content(12L, "draft", "초안");
        when(contentRepository.findByIdForUpdate(12L)).thenReturn(Optional.of(draft));
        assertThatThrownBy(() -> service.updateHome(CmsHomeUpdateRequest.builder().contsSn(12L).version(2).build()))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.INVALID_STATE);

        CmsContent publishedButArchived = content(13L, "archived", "보관");
        publishedButArchived.publish(50L);
        publishedButArchived.archive();
        when(contentRepository.findByIdForUpdate(13L)).thenReturn(Optional.of(publishedButArchived));
        assertThatThrownBy(() -> service.updateHome(CmsHomeUpdateRequest.builder().contsSn(13L).version(2).build()))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.INVALID_STATE);

        verify(siteSettingRepository, never()).flush();
        verify(sensitiveAudit, never()).recordMutation(any(), any());
    }

    @Test
    void currentHomeContsSnAndLockHomeReflectRepositoryState() {
        when(siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.of(setting(15L, 1)));
        assertThat(service.currentHomeContsSn()).isEqualTo(15L);

        when(siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.empty());
        assertThat(service.currentHomeContsSn()).isNull();

        CmsSiteSetting locked = setting(15L, 1);
        when(siteSettingRepository.findByStngCdForUpdate(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.of(locked));
        assertThat(service.lockHome()).isSameAs(locked);
    }
}
