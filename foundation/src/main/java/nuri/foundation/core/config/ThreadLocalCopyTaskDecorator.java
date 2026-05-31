package nuri.foundation.core.config;

import org.springframework.core.task.TaskDecorator;

/**
 * 쿼리 카운터 및 ThreadLocal 샌드박스를 비동기 실행 스레드 풀로 안전 복사/정리하는 리플렉션 데코레이터
 * - 컴파일 타임에 business-suite 모듈의 testFixtures 클래스(QueryCountInspector)에 직접 의존하지 않기 위해
 *   리플렉션 기법을 도입하여 프로덕션에는 영향 없이 테스트 시에만 유동적으로 작동하도록 격리합니다.
 */
public class ThreadLocalCopyTaskDecorator implements TaskDecorator {

    @Override
    public Runnable decorate(Runnable runnable) {
        Object parentCounter = null;
        java.lang.reflect.Method getMethod = null;
        java.lang.reflect.Method setMethod = null;
        java.lang.reflect.Method clearMethod = null;

        try {
            Class<?> inspectorClass = Class.forName("nuri.business.core.harness.QueryCountInspector");
            getMethod = inspectorClass.getMethod("getCounterObject");
            
            // setCounterObject 파라미터 타입 매핑
            Class<?> counterClass = Class.forName("nuri.business.core.harness.QueryCountInspector$QueryCounter");
            setMethod = inspectorClass.getMethod("setCounterObject", counterClass);
            
            clearMethod = inspectorClass.getMethod("clear");
            
            // 부모 스레드의 쿼리 카운터 객체 읽어옴
            parentCounter = getMethod.invoke(null);
        } catch (Exception ignored) {
            // 테스트 환경이 아니거나 클래스패스 상에 존재하지 않을 경우 무시
        }

        final Object finalParentCounter = parentCounter;
        final java.lang.reflect.Method finalSetMethod = setMethod;
        final java.lang.reflect.Method finalClearMethod = clearMethod;

        return () -> {
            try {
                // 비동기 스레드 실행 전 부모 쿼리 카운터 복사 주입
                if (finalParentCounter != null && finalSetMethod != null) {
                    finalSetMethod.invoke(null, finalParentCounter);
                }
                runnable.run();
            } catch (Exception e) {
                if (e instanceof RuntimeException) {
                    throw (RuntimeException) e;
                }
                throw new RuntimeException(e);
            } finally {
                // 스레드 풀 재사용으로 인한 찌꺼기 방지를 위해 깨끗이 정리(Remove)
                if (finalClearMethod != null) {
                    try {
                        finalClearMethod.invoke(null);
                    } catch (Exception ignored) {
                    }
                }
            }
        };
    }
}
