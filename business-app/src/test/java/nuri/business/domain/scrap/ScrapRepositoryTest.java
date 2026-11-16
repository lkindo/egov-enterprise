package nuri.business.domain.scrap;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import nuri.business.domain.config.JpaConfig;
import nuri.business.security.audit.LoginUserAuditorAware;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 스크랩 보관함 목록의 순서를 고정한다(2026-11-16).
 *
 * <p>컨트롤러는 요청 정렬을 받지 않으므로 순서는 저장소 메서드가 정한다. 종전 메서드는 정렬이 없어 DB 가 돌려주는 순서로 쪽을 나눴고,
 * 쪽을 넘기면 같은 항목이 다시 나오거나 빠질 수 있었다.
 */
@DataJpaTest
@Import({JpaConfig.class, LoginUserAuditorAware.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.main.allow-bean-definition-overriding=true")
@DisplayName("ScrapRepository 테스트")
class ScrapRepositoryTest {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }

    @Autowired
    private ScrapRepository scrapRepository;

    private Scrap save(String name, String useYn) {
        return scrapRepository.saveAndFlush(Scrap.builder()
                .scrapNm(name)
                .scrapUrl("/board/posts/" + name)
                .useYn(useYn)
                .build());
    }

    @Test
    @DisplayName("보관함 목록은 최근 스크랩부터 쪽을 나누고, 쪽을 넘겨도 겹치거나 빠지지 않는다")
    void pagesNewestFirstWithoutOverlap() {
        Scrap first = save("first", "Y");
        save("hidden", "N");
        Scrap second = save("second", "Y");
        Scrap third = save("third", "Y");
        String owner = first.getFrstRgtrId();

        var firstPage = scrapRepository.findByFrstRgtrIdAndUseYnOrderByScrapSnDesc(owner, "Y", PageRequest.of(0, 2));
        var secondPage = scrapRepository.findByFrstRgtrIdAndUseYnOrderByScrapSnDesc(owner, "Y", PageRequest.of(1, 2));

        assertThat(firstPage.getContent()).extracting(Scrap::getScrapSn)
                .containsExactly(third.getScrapSn(), second.getScrapSn());
        assertThat(secondPage.getContent()).extracting(Scrap::getScrapSn)
                .containsExactly(first.getScrapSn());
        assertThat(firstPage.getTotalElements()).isEqualTo(3);
    }
}
