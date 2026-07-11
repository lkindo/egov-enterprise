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
        assertThat(testService.required(() -> value, "error")).isEqualTo(value);

        assertThatThrownBy(() -> testService.required(null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("조건 검증 테스트")
    void conditionTest() {
        testService.isTrue(true, "error");
        testService.isFalse(false, "error");

        assertThatThrownBy(() -> testService.isTrue(false, "error"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> testService.isFalse(true, "error"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("DTO 변환 테스트")
    void toDtoTest() {
        String entity = "Entity";
        String dto = testService.toDto(entity, e -> e + "Dto");
        assertThat(dto).isEqualTo("EntityDto");
    }

    @Test
    @DisplayName("리스트 변환 테스트")
    void toDtoListTest() {
        List<String> entities = Arrays.asList("E1", "E2");
        List<String> dtos = testService.toDtoList(entities, e -> e + "D");
        assertThat(dtos).containsExactly("E1D", "E2D");

        assertThat(testService.toDtoList(null, e -> e)).isEmpty();
        assertThat(testService.toDtoList(Collections.emptyList(), e -> e)).isEmpty();
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
    }

    @Test
    @DisplayName("기본값 반환 테스트")
    void defaultTest() {
        assertThat(testService.defaultIfNull("val", "def")).isEqualTo("val");
        assertThat(testService.defaultIfNull(null, "def")).isEqualTo("def");

        assertThat(testService.defaultIfBlank("val", "def")).isEqualTo("val");
        assertThat(testService.defaultIfBlank(" ", "def")).isEqualTo("def");
        assertThat(testService.defaultIfBlank(null, "def")).isEqualTo("def");
    }

    @Test
    @DisplayName("예외 래핑 테스트")
    void wrapExceptionTest() throws Exception {
        assertThatThrownBy(() -> testService.wrapException(() -> {
            throw new RuntimeException("error");
        }, () -> new Exception("wrapped")))
                .isInstanceOf(Exception.class)
                .hasMessage("wrapped");

        String result = testService.wrapException(() -> "success", () -> new Exception("wrapped"));
        assertThat(result).isEqualTo("success");
    }
}
