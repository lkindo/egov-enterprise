package nuri.foundation.core.config;

import nuri.business.core.harness.QueryCountInspector;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("ThreadLocalCopyTaskDecorator 단위 테스트")
class ThreadLocalCopyTaskDecoratorTest {

    private final ThreadLocalCopyTaskDecorator decorator = new ThreadLocalCopyTaskDecorator();

    @Test
    @DisplayName("데코레이션된 Runnable은 원본 작업을 실행한다")
    void decorate_runsOriginalRunnable() {
        AtomicBoolean ran = new AtomicBoolean(false);
        Runnable decorated = decorator.decorate(() -> ran.set(true));
        decorated.run();
        assertThat(ran).isTrue();
    }

    @Test
    @DisplayName("원본 작업의 RuntimeException은 삼켜지지 않고 전파된다")
    void decorate_propagatesRuntimeException() {
        Runnable decorated = decorator.decorate(() -> {
            throw new IllegalStateException("boom");
        });
        assertThatThrownBy(decorated::run)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("boom");
    }

    @Test
    @DisplayName("decorate 호출은 null이 아닌 실행 가능한 Runnable을 반환한다")
    void decorate_returnsNonNull() {
        assertThat(decorator.decorate(() -> {})).isNotNull();
    }

    @Test
    @DisplayName("부모 쿼리 카운터를 작업에 전달하고 실행 후 제거한다")
    void decorate_copiesAndClearsParentCounter() {
        QueryCountInspector.QueryCounter parent = new QueryCountInspector.QueryCounter();
        QueryCountInspector.setCounterObject(parent);
        AtomicReference<QueryCountInspector.QueryCounter> observed = new AtomicReference<>();

        Runnable decorated = decorator.decorate(
                () -> observed.set(QueryCountInspector.getCounterObject()));
        QueryCountInspector.clear();

        decorated.run();

        assertThat(observed.get()).isSameAs(parent);
        assertThat(QueryCountInspector.getCounterObject()).isNull();
    }
}
