package nuri.foundation.core.config;

import org.springframework.core.task.TaskDecorator;
import java.lang.reflect.Method;

/**
 * 쿼리 카운터 및 ThreadLocal 샌드박스를 비동기 실행 스레드 풀로 안전 복사/정리하는 리플렉션 데코레이터
 * - 컴파일 타임에 business-suite 모듈의 testFixtures 클래스(QueryCountInspector)에 직접 의존하지 않기 위해
 *   리플렉션 기법을 도입하여 프로덕션에는 영향 없이 테스트 시에만 유동적으로 작동하도록 격리합니다.
 * - [성능] 리플렉션 핸들은 클래스 로드 시 1회만 해석·캐시한다. 과거에는 decorate() 호출마다 Class.forName이
 *   실행되어 프로덕션(하네스 부재)에서 매 async 제출마다 ClassNotFoundException을 던지고 삼키는
 *   예외 기반 핫패스였다.
 */
public class ThreadLocalCopyTaskDecorator implements TaskDecorator {

    private static final Method GET_METHOD;
    private static final Method SET_METHOD;
    private static final Method CLEAR_METHOD;

    static {
        Method get = null, set = null, clear = null;
        try {
            Class<?> inspectorClass = Class.forName("nuri.business.core.harness.QueryCountInspector");
            get = inspectorClass.getMethod("getCounterObject");
            Class<?> counterClass = Class.forName("nuri.business.core.harness.QueryCountInspector$QueryCounter");
            set = inspectorClass.getMethod("setCounterObject", counterClass);
            clear = inspectorClass.getMethod("clear");
        } catch (Throwable ignored) {
            // 테스트 하네스가 클래스패스에 없으면(프로덕션) 핸들은 null → 데코레이터는 no-op.
        }
        GET_METHOD = get;
        SET_METHOD = set;
        CLEAR_METHOD = clear;
    }

    @Override
    public Runnable decorate(Runnable runnable) {
        // 하네스 부재(프로덕션): 오버헤드 없이 원본 그대로 반환.
        if (GET_METHOD == null || SET_METHOD == null || CLEAR_METHOD == null) {
            return runnable;
        }

        Object parentCounter = null;
        try {
            // 부모 스레드의 쿼리 카운터 객체 읽어옴
            parentCounter = GET_METHOD.invoke(null);
        } catch (Exception ignored) {
            // 무시 — 데코레이션 없이 진행
        }
        final Object finalParentCounter = parentCounter;

        return () -> {
            try {
                // 비동기 스레드 실행 전 부모 쿼리 카운터 복사 주입
                if (finalParentCounter != null) {
                    SET_METHOD.invoke(null, finalParentCounter);
                }
                runnable.run();
            } catch (Exception e) {
                if (e instanceof RuntimeException) {
                    throw (RuntimeException) e;
                }
                throw new RuntimeException(e);
            } finally {
                // 스레드 풀 재사용으로 인한 찌꺼기 방지를 위해 깨끗이 정리(Remove)
                try {
                    CLEAR_METHOD.invoke(null);
                } catch (Exception ignored) {
                }
            }
        };
    }
}
