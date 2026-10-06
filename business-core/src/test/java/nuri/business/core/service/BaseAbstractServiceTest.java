package nuri.business.core.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("공통 서비스(BaseAbstractService) 테스트")
class BaseAbstractServiceTest {

    private final TestService testService = new TestService();

    static class TestService extends BaseAbstractService {
        // 테스트용 구체 클래스
    }

    @Test
    @DisplayName("null 검증 테스트")
    void requiredTest() {
        String value = "test";
        assertThat(testService.required(value)).isEqualTo(value);
        assertThat(testService.required(value, "error")).isEqualTo(value);

        assertThatThrownBy(() -> testService.required(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("페이지 변환 테스트")
    void toPageTest() {
        Page<String> entityPage = new PageImpl<>(Arrays.asList("E1", "E2"), PageRequest.of(0, 10), 2);
        Page<String> dtoPage = testService.toPage(entityPage, e -> e + "D");

        assertThat(dtoPage.getContent()).containsExactly("E1D", "E2D");
        assertThat(dtoPage.getTotalElements()).isEqualTo(2);

        List<String> list = Arrays.asList("E1", "E2");
        Page<String> pageFromList = testService.toPage(list, PageRequest.of(0, 10), 2, e -> e + "D");
        assertThat(pageFromList.getContent()).containsExactly("E1D", "E2D");

        // 빈 목록은 빈 페이지, null 목록·null 원소는 가드가 거부한다.
        assertThat(testService.toPage(Collections.<String>emptyList(), PageRequest.of(0, 10), 0, e -> e).getContent()).isEmpty();
        assertThatThrownBy(() -> testService.toPage((List<String>) null, PageRequest.of(0, 10), 0, e -> e))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> testService.toPage(Arrays.asList("E1", null), PageRequest.of(0, 10), 2, e -> e))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
