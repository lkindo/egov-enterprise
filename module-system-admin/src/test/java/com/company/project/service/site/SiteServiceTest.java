package com.company.project.service.site;

import com.company.project.domain.site.Site;
import com.company.project.domain.site.SiteDomainRepository;
import com.company.project.service.site.dto.SiteDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("SiteService 테스트")
class SiteServiceTest {

    @Mock
    private SiteDomainRepository siteRepository;

    @InjectMocks
    private SiteService siteService;

    @Test
    @DisplayName("사이트 목록 조회")
    void getSiteList_Success() {
        // Given
        PageRequest pageable = PageRequest.of(0, 10);
        Site entity = Site.builder().siteId("S1").siteNm("Site1").build();
        given(siteRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        // When
        Page<SiteDto> result = siteService.getSiteList(null, pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("사이트 상세 조회")
    void getSite_Success() {
        // Given
        Site entity = Site.builder().siteId("S1").siteNm("Site1").build();
        given(siteRepository.findById("S1")).willReturn(Optional.of(entity));

        // When
        SiteDto result = siteService.getSite("S1");

        // Then
        assertThat(result.getSiteId()).isEqualTo("S1");
    }

    @Test
    @DisplayName("사이트 등록")
    void createSite_Success() {
        // Given
        SiteDto dto = SiteDto.builder().siteNm("New Site").build();

        // When
        String siteId = siteService.createSite("user1", dto);

        // Then
        assertThat(siteId).startsWith("SITE_");
        verify(siteRepository).save(any(Site.class));
    }

    @Test
    @DisplayName("사이트 수정")
    void updateSite_Success() {
        // Given
        Site entity = Site.builder().siteId("S1").build();
        given(siteRepository.findById("S1")).willReturn(Optional.of(entity));
        SiteDto dto = SiteDto.builder().siteNm("Updated Site").build();

        // When
        siteService.updateSite("S1", "user1", dto);

        // Then
        assertThat(entity.getSiteNm()).isEqualTo("Updated Site");
    }

    @Test
    @DisplayName("사이트 삭제")
    void deleteSite_Success() {
        // When
        siteService.deleteSite("S1");

        // Then
        verify(siteRepository).deleteById("S1");
    }
}
