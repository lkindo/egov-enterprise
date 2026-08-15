package nuri.business.service.scrap;

import nuri.business.domain.scrap.Scrap;
import nuri.business.domain.scrap.ScrapRepository;
import nuri.business.service.scrap.dto.ScrapDto;
import nuri.business.service.scrap.dto.ScrapMapper;
import nuri.business.service.scrap.dto.ScrapMapperImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScrapService 테스트")
class ScrapServiceTest {

    // 소유권 가드(SecurityUtil.assertOwnerOrAdmin)를 no-op 처리 — 소유권 로직은 SecurityUtilTest 가 검증.
    // (가드 배선은 이 mock 제거 시 ACCESS_DENIED 로 실패함으로써 증명됨)
    private org.mockito.MockedStatic<nuri.business.security.util.SecurityUtil> __secUtilMock;
    @org.junit.jupiter.api.BeforeEach
    void __openSecUtilMock() { __secUtilMock = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class); }
    @org.junit.jupiter.api.AfterEach
    void __closeSecUtilMock() { if (__secUtilMock != null) __secUtilMock.close(); }

    @Mock
    private ScrapRepository scrapRepository;

    // 매핑은 실제 MapStruct 구현으로 검증한다(모킹 시 URL/설명 누락 회귀를 잡지 못함).
    @Spy
    private ScrapMapper scrapMapper = new ScrapMapperImpl();

    @InjectMocks
    private ScrapService scrapService;

    @Test
    @DisplayName("내 스크랩 목록 조회")
    void getMyScrapList_Success() {
        // Given
        PageRequest pageable = PageRequest.of(0, 10);
        Scrap entity = Scrap.builder().scrapSn(1L).scrapNm("Title").build();
        given(scrapRepository.findByFrstRgtrIdAndUseYn(eq("user1"), eq("Y"), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        // When
        Page<ScrapDto> result = scrapService.getScrapList("user1", pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("스크랩 상세 조회 — 응답에 URL·설명이 포함된다")
    void getScrap_Success() {
        // Given
        Scrap entity = Scrap.builder().scrapSn(1L).scrapUrl("https://example.com").scrapExpln("설명").build();
        given(scrapRepository.findById(1L)).willReturn(Optional.of(entity));

        // When
        ScrapDto result = scrapService.getScrap(1L);

        // Then
        assertThat(result.getScrapSn()).isEqualTo(1L);
        assertThat(result.getScrapUrl()).isEqualTo("https://example.com"); // [회귀가드] 과거 convertToDto 누락
        assertThat(result.getScrapExpln()).isEqualTo("설명");
    }

    @Test
    @DisplayName("스크랩 등록 — URL·설명·사용여부가 저장 엔티티까지 전달된다")
    void createScrap_Success() throws Exception {
        // Given
        ScrapDto dto = ScrapDto.builder()
                .scrapNm("New")
                .scrapUrl("https://example.com")
                .scrapExpln("설명")
                .useYn("Y")
                .build();

        // when
        given(scrapRepository.save(org.mockito.ArgumentMatchers.any(Scrap.class)))
                .willReturn(Scrap.builder().scrapSn(2L).build());

        Long result = scrapService.createScrap("user1", dto);

        // then
        org.mockito.ArgumentCaptor<Scrap> captor = org.mockito.ArgumentCaptor.forClass(Scrap.class);
        verify(scrapRepository).save(captor.capture());
        Scrap saved = captor.getValue();
        assertThat(saved.getScrapSn()).isNull();
        assertThat(saved.getScrapNm()).isEqualTo("New");
        assertThat(saved.getScrapUrl()).isEqualTo("https://example.com"); // [회귀가드] 과거 builder 누락으로 항상 null
        assertThat(saved.getScrapExpln()).isEqualTo("설명");
        assertThat(saved.getUseYn()).isEqualTo("Y");
        assertThat(result).isEqualTo(2L);
    }

    @Test
    @DisplayName("스크랩 수정 — DTO 값이 실제로 반영된다")
    void updateScrap_Success() {
        // Given
        Scrap entity = Scrap.builder().scrapSn(1L).scrapNm("Old").scrapUrl("https://old.example.com")
                .scrapExpln("옛 설명").useYn("Y").build();
        given(scrapRepository.findById(1L)).willReturn(Optional.of(entity));
        ScrapDto dto = ScrapDto.builder().scrapSn(999L).scrapNm("Updated")
                .scrapUrl("https://new.example.com").scrapExpln("새 설명").useYn("Y").build();

        // when
        scrapService.updateScrap(1L, "user1", dto);

        // Then
        assertThat(entity.getScrapNm()).isEqualTo("Updated");
        assertThat(entity.getScrapUrl()).isEqualTo("https://new.example.com"); // [회귀가드] 과거 자기값 재대입으로 무동작
        assertThat(entity.getScrapExpln()).isEqualTo("새 설명");
        assertThat(entity.getUseYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("스크랩 수정 — useYn 미전달 시 기존 값 보존(목록에서 증발 방지)")
    void updateScrap_KeepsUseYnWhenAbsent() {
        // Given
        Scrap entity = Scrap.builder().scrapSn(1L).scrapNm("Old").useYn("Y").build();
        given(scrapRepository.findById(1L)).willReturn(Optional.of(entity));
        ScrapDto dto = ScrapDto.builder().scrapSn(999L).scrapNm("Updated").build();

        // when
        scrapService.updateScrap(1L, "user1", dto);

        // Then
        assertThat(entity.getUseYn()).isEqualTo("Y");
    }

    @Test
    @DisplayName("스크랩 삭제")
    void deleteScrap_Success() {
        // Given — 소유권 가드용 findById(삭제 시 findById→delete 로 변경됨)
        nuri.business.domain.scrap.Scrap scrap = nuri.business.domain.scrap.Scrap.builder().scrapSn(1L).build();
        org.mockito.Mockito.when(scrapRepository.findById(1L)).thenReturn(java.util.Optional.of(scrap));

        // When
        scrapService.deleteScrap(1L);

        // Then
        verify(scrapRepository).delete(scrap);
    }
}
