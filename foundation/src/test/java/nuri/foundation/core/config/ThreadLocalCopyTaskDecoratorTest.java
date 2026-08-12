package nuri.foundation.core.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
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
    void decorate_copiesAndClearsParentCounter() throws ReflectiveOperationException {
        Method get = InspectorStub.class.getDeclaredMethod("getCounterObject");
        Method set = InspectorStub.class.getDeclaredMethod("setCounterObject", Object.class);
        Method clear = InspectorStub.class.getDeclaredMethod("clear");
        get.setAccessible(true);
        set.setAccessible(true);
        clear.setAccessible(true);
        ThreadLocalCopyTaskDecorator injected = new ThreadLocalCopyTaskDecorator(get, set, clear);
        Object parent = new Object();
        InspectorStub.setCounterObject(parent);
        AtomicReference<Object> observed = new AtomicReference<>();

        Runnable decorated = injected.decorate(
                () -> observed.set(InspectorStub.getCounterObject()));
        InspectorStub.clear();

        decorated.run();

        assertThat(observed.get()).isSameAs(parent);
        assertThat(InspectorStub.getCounterObject()).isNull();
    }

    private static final class InspectorStub {
        private static final ThreadLocal<Object> COUNTER = new ThreadLocal<>();

        public static Object getCounterObject() {
            return COUNTER.get();
        }

        public static void setCounterObject(Object counter) {
            COUNTER.set(counter);
        }

        public static void clear() {
            COUNTER.remove();
        }
    }
}
