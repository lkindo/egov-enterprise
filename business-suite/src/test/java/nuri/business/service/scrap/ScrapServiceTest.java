package nuri.business.service.scrap;

import nuri.business.domain.scrap.Scrap;
import nuri.business.domain.scrap.ScrapRepository;
import nuri.business.service.scrap.dto.ScrapDto;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScrapService 테스트")
class ScrapServiceTest {

    @Mock
    private ScrapRepository scrapRepository;

    @InjectMocks
    private ScrapService scrapService;

    @Test
    @DisplayName("내 스크랩 목록 조회")
    void getMyScrapList_Success() {
        // Given
        PageRequest pageable = PageRequest.of(0, 10);
        Scrap entity = Scrap.builder().scrapId("S1").scrapNm("Title").build();
        given(scrapRepository.findByCreatedByAndUseYn(eq("user1"), eq("Y"), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        // When
        Page<ScrapDto> result = scrapService.getScrapList("user1", pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("스크랩 상세 조회")
    void getScrap_Success() {
        // Given
        Scrap entity = Scrap.builder().scrapId("S1").build();
        given(scrapRepository.findById("S1")).willReturn(Optional.of(entity));

        // When
        ScrapDto result = scrapService.getScrap("S1");

        // Then
        assertThat(result.getScrapId()).isEqualTo("S1");
    }

    @Test
    @DisplayName("스크랩 등록")
    void createScrap_Success() throws Exception {
        // Given
        ScrapDto dto = ScrapDto.builder().scrapNm("New").build();

        // when
        scrapService.createScrap("user1", dto);

        // then
        verify(scrapRepository).save(any(Scrap.class));
    }

    @Test
    @DisplayName("스크랩 수정")
    void updateScrap_Success() {
        // Given
        Scrap entity = Scrap.builder().scrapId("S1").build();
        given(scrapRepository.findById("S1")).willReturn(Optional.of(entity));
        ScrapDto dto = ScrapDto.builder().scrapId("S1").scrapNm("Updated").build();

        // when
        scrapService.updateScrap("user1", dto);

        // Then
        assertThat(entity.getScrapNm()).isEqualTo("Updated");
    }

    @Test
    @DisplayName("스크랩 삭제")
    void deleteScrap_Success() {
        // Given
        Scrap entity = Scrap.builder().scrapId("S1").build();
        given(scrapRepository.findById("S1")).willReturn(Optional.of(entity));

        // When
        scrapService.deleteScrap("S1");

        // Then
        verify(scrapRepository).delete(entity);
    }
}
