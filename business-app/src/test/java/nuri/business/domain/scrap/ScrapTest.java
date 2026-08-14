package nuri.business.domain.scrap;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Scrap 엔티티 단위 테스트")
class ScrapTest {

    @Test
    @DisplayName("Scrap 엔티티 표준 빌더 및 초기화 검증")
    void standardBuilderTest() {
        // Given & When
        Scrap scrap = Scrap.builder()
                .scrapSn(1L)
                .bbsId("BBS_001")
                .pstId("POST_001")
                .scrapNm("테스트 스크랩")
                .scrapUrl("https://example.com/posts/1")
                .scrapExpln("스크랩 테스트 설명글")
                .useYn("Y")
                .build();
        scrap.setFrstRgtrId("user1");
        scrap.setLastMdfrId("user1");

        // Then
        assertThat(scrap.getScrapSn()).isEqualTo(1L);
        assertThat(scrap.getBbsId()).isEqualTo("BBS_001");
        assertThat(scrap.getPstId()).isEqualTo("POST_001");
        assertThat(scrap.getScrapNm()).isEqualTo("테스트 스크랩");
        assertThat(scrap.getScrapUrl()).isEqualTo("https://example.com/posts/1");
        assertThat(scrap.getScrapExpln()).isEqualTo("스크랩 테스트 설명글");
        assertThat(scrap.getUseYn()).isEqualTo("Y");
        assertThat(scrap.getFrstRgtrId()).isEqualTo("user1");
        
    }

    @Test
    @DisplayName("Scrap 엔티티 기본값 검증")
    void defaultValuesTest() {
        // Given & When
        Scrap scrap = Scrap.builder()
                .scrapSn(2L)
                .build();

        // Then
        assertThat(scrap.getUseYn()).isEqualTo("Y"); // @Builder.Default 검증
    }

    @Test
    @DisplayName("Scrap 엔티티 비즈니스 로직(update) 검증")
    void updateTest() {
        // Given
        Scrap scrap = Scrap.builder()
                .scrapSn(1L)
                .scrapNm("이전 이름")
                .scrapUrl("이전 URL")
                .scrapExpln("이전 설명")
                .useYn("N")
                .build();

        // When
        scrap.update("새로운 이름", "새로운 URL", "새로운 설명", "Y");

        // Then
        assertThat(scrap.getScrapNm()).isEqualTo("새로운 이름");
        assertThat(scrap.getScrapUrl()).isEqualTo("https://example.com/posts/1".replace("https://example.com/posts/1", "새로운 URL"));
        assertThat(scrap.getScrapUrl()).isEqualTo("새로운 URL");
        assertThat(scrap.getScrapExpln()).isEqualTo("새로운 설명");
        assertThat(scrap.getUseYn()).isEqualTo("Y");
    }

}
