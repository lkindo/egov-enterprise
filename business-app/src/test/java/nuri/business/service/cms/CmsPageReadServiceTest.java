package nuri.business.service.cms;

import nuri.business.domain.cms.CmsContent;
import nuri.business.domain.cms.CmsContentRepository;
import nuri.business.domain.cms.CmsContentRevision;
import nuri.business.domain.cms.CmsContentRevisionRepository;
import nuri.business.domain.cms.CmsSiteSetting;
import nuri.business.domain.cms.CmsSiteSettingRepository;
import nuri.business.service.cms.dto.CmsPublishedPageDto;
import nuri.business.service.cms.dto.CmsPublishedPageSummaryDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 사용자 게시본 조회·목록·홈 소개 조회 단위 테스트(ADR-0039 결정 3, ADR-0042). */
@ExtendWith(MockitoExtension.class)
class CmsPageReadServiceTest {

    private static final String DOCUMENT_JSON = "{\"schemaVersion\":1,\"sections\":[{\"id\":\"a\",\"label\":\"\",\"layout\":\"one\","
            + "\"tone\":\"default\",\"spacing\":\"normal\",\"cells\":[{\"kind\":\"rich\",\"doc\":{\"type\":\"doc\",\"content\":["
            + "{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"본문\"}]}]}}]}]}";

    @Mock private CmsContentRepository contentRepository;
    @Mock private CmsContentRevisionRepository revisionRepository;
    @Mock private CmsSiteSettingRepository siteSettingRepository;
    @Spy private CmsDocumentValidator validator = new CmsDocumentValidator();
    @InjectMocks private CmsPageReadService service;

    private static CmsContent content(Long contsSn, String slug) {
        CmsContent content = CmsContent.create(slug, "초안", "초안 요약", DOCUMENT_JSON);
        ReflectionTestUtils.setField(content, "contsSn", contsSn);
        return content;
    }

    private static CmsContentRevision revision(Long rvsnSn, Long contsSn, String title, String summary, LocalDateTime crtDt) {
        CmsContentRevision revision = CmsContentRevision.create(contsSn, title, summary, DOCUMENT_JSON, "사유", "editor", crtDt);
        ReflectionTestUtils.setField(revision, "contsRvsnSn", rvsnSn);
        return revision;
    }

    @Test
    void getPublishedPageRejectsInvalidOrOverlengthPathsWithoutQueryingRepository() {
        for (String invalid : new String[]{null, "", "Guide", "-guide", "guide-", "guide--sub", "a".repeat(101)}) {
            assertThatThrownBy(() -> service.getPublishedPage(invalid))
                    .isInstanceOf(BusinessException.class)
                    .extracting(error -> ((BusinessException) error).getErrorCode())
                    .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
        }
        verify(contentRepository, never()).findByContsPathNm(any());
    }

    @Test
    void getPublishedPageAcceptsMaxBoundarySlugAndReturnsRevisionNumber() {
        String maxSlug = "a".repeat(100);
        LocalDateTime publishedAt = LocalDateTime.of(2026, 11, 11, 10, 30);
        CmsContent published = content(3L, maxSlug);
        published.publish(12L);
        when(contentRepository.findByContsPathNm(maxSlug)).thenReturn(Optional.of(published));
        when(revisionRepository.findById(12L)).thenReturn(Optional.of(revision(12L, 3L, "게시 제목", "게시 요약", publishedAt)));
        when(revisionRepository.countByContsSnAndContsRvsnSnLessThanEqual(3L, 12L)).thenReturn(2L);

        CmsPublishedPageDto dto = service.getPublishedPage(maxSlug);

        assertThat(dto.contsPathNm()).isEqualTo(maxSlug);
        assertThat(dto.contsTtl()).isEqualTo("게시 제목");
        assertThat(dto.contsExpln()).isEqualTo("게시 요약");
        assertThat(dto.revisionNumber()).isEqualTo(2L);
        assertThat(dto.publishedAt()).isEqualTo(publishedAt);
        assertThat(dto.document()).isNotNull();
    }

    @Test
    void getPublishedPageTreatsUnpublishedArchivedAndMissingRevisionAsNotFound() {
        CmsContent draft = content(1L, "draft-page");
        when(contentRepository.findByContsPathNm("draft-page")).thenReturn(Optional.of(draft));
        assertThatThrownBy(() -> service.getPublishedPage("draft-page"))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);

        CmsContent archived = content(2L, "archived-page");
        archived.publish(10L);
        archived.archive();
        when(contentRepository.findByContsPathNm("archived-page")).thenReturn(Optional.of(archived));
        assertThatThrownBy(() -> service.getPublishedPage("archived-page"))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);

        CmsContent dangling = content(3L, "dangling-page");
        dangling.publish(99L);
        when(contentRepository.findByContsPathNm("dangling-page")).thenReturn(Optional.of(dangling));
        when(revisionRepository.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getPublishedPage("dangling-page"))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    void getPublishedPagesEscapesKeywordAndMapsContentSlugs() {
        PageRequest pageable = PageRequest.of(0, 10);
        LocalDateTime t1 = LocalDateTime.of(2026, 11, 11, 9, 0);
        CmsContentRevision rev = revision(20L, 7L, "가이드", "요약", t1);
        when(revisionRepository.searchPublished("50\\%\\_\\\\a", pageable))
                .thenReturn(new PageImpl<>(List.of(rev), pageable, 1));
        when(contentRepository.findAllById(List.of(7L))).thenReturn(List.of(content(7L, "service-guide")));

        Page<CmsPublishedPageSummaryDto> page = service.getPublishedPages(" 50%_\\a ", pageable);

        assertThat(page.getContent()).containsExactly(
                new CmsPublishedPageSummaryDto("service-guide", "가이드", "요약", t1));
    }

    @Test
    void getHomeIntroReturnsPublishedPageOnlyWhenPointedAndActive() {
        when(siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.empty());
        assertThat(service.getHomeIntro()).isEmpty();

        CmsSiteSetting emptySetting = CmsSiteSetting.create(CmsSiteSetting.HOME_INTRO);
        when(siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.of(emptySetting));
        assertThat(service.getHomeIntro()).isEmpty();

        CmsSiteSetting pointed = CmsSiteSetting.create(CmsSiteSetting.HOME_INTRO);
        pointed.point(5L);
        when(siteSettingRepository.findByStngCd(CmsSiteSetting.HOME_INTRO)).thenReturn(Optional.of(pointed));

        CmsContent unpublished = content(5L, "home-guide");
        when(contentRepository.findById(5L)).thenReturn(Optional.of(unpublished));
        assertThat(service.getHomeIntro()).isEmpty();

        unpublished.publish(33L);
        LocalDateTime publishedAt = LocalDateTime.of(2026, 11, 11, 8, 0);
        when(revisionRepository.findById(33L)).thenReturn(Optional.of(revision(33L, 5L, "홈 소개", "설명", publishedAt)));
        when(revisionRepository.countByContsSnAndContsRvsnSnLessThanEqual(5L, 33L)).thenReturn(1L);

        assertThat(service.getHomeIntro()).isPresent().get().satisfies(dto -> {
            assertThat(dto.contsPathNm()).isEqualTo("home-guide");
            assertThat(dto.contsTtl()).isEqualTo("홈 소개");
            assertThat(dto.revisionNumber()).isEqualTo(1L);
        });
    }
}
