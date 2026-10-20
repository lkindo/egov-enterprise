package nuri.business.service.code;

import nuri.business.domain.code.CommonCode;
import nuri.business.domain.code.CommonCodeCategoryRepository;
import nuri.business.domain.code.CommonCodeChangeRepository;
import nuri.business.domain.code.CommonCodeGroupRepository;
import nuri.business.domain.code.CommonCodeRepository;
import nuri.business.service.code.dto.CommonCodeDto;
import nuri.business.service.code.dto.CommonCodeMapperImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * [2026-10-20] 공통코드 그룹 조회는 캐시 없이 늘 DB 를 읽는다 — 캐시가 켜진 스프링 문맥에서도.
 *
 * <p>종전 Caffeine 로컬 캐시는 쓴 인스턴스만 비워 다른 인스턴스가 최대 10분 옛 업무 구분으로 상신을 검증했다. 운영과 같이 캐시를
 * 켠 문맥(@EnableCaching + 캐시 관리자)에서 두 번 읽는 사이 저장소 값이 바뀌면(다른 인스턴스가 바꾼 것과 같다) 두 번째 읽기가
 * 새 값이어야 한다. 누가 {@code @Cacheable} 을 되돌리면 두 번째 읽기가 첫 값을 돌려줘 이 시험이 실패한다.
 */
@DisplayName("CommonCodeService — 그룹 조회는 캐시하지 않는다")
class CommonCodeServiceCachingTest {

    @Configuration
    @EnableCaching
    static class CachingContext {
        static final CommonCodeRepository CODES = mock(CommonCodeRepository.class);

        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager();
        }

        @Bean
        CommonCodeService commonCodeService() {
            return new CommonCodeService(CODES, mock(CommonCodeCategoryRepository.class), mock(CommonCodeGroupRepository.class),
                    new CommonCodeMapperImpl(), mock(CommonCodeChangeRepository.class), new CommonCodeUsageCatalog(List.of()));
        }
    }

    private static CommonCode code(String dtlCd, String name) {
        return CommonCode.builder().cdId("COM075").dtlCd(dtlCd).dtlCdNm(name).useYn("Y").build();
    }

    @Test
    @DisplayName("두 번 읽는 사이 바뀐 상세 코드를 두 번째 읽기가 그대로 본다")
    void readsTheRepositoryEveryTimeEvenWithCachingEnabled() {
        given(CachingContext.CODES.findByCdIdAndUseYn("COM075", "Y"))
                .willReturn(List.of(code("WF", "검토")))
                .willReturn(List.of(code("WF", "검토"), code("PAY", "지출")));
        try (var context = new AnnotationConfigApplicationContext(CachingContext.class)) {
            CommonCodeService service = context.getBean(CommonCodeService.class);

            List<CommonCodeDto> first = service.getCodesByGroup("COM075");
            List<CommonCodeDto> second = service.getCodesByGroup("COM075");

            assertThat(first).extracting(CommonCodeDto::dtlCd).containsExactly("WF");
            assertThat(second).extracting(CommonCodeDto::dtlCd).containsExactly("WF", "PAY");
            verify(CachingContext.CODES, times(2)).findByCdIdAndUseYn("COM075", "Y");
        }
    }
}
