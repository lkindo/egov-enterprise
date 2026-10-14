package nuri.business.core.softdelete;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.hibernate.Session;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

@Slf4j
@Aspect
@Component
@Order(20) // Spring의 TransactionInterceptor보다 내부에서 시작되어 영속성 컨텍스트(Session)가 열린 시점에 동작하도록 우선순위를 지정합니다.
@RequiredArgsConstructor
public class SoftDeleteAspect {

    private final EntityManager entityManager;
    private static final String FILTER_NAME = "softDeleteFilter";
    private static final ThreadLocal<Integer> CALL_DEPTH = ThreadLocal.withInitial(() -> 0);
    private static final ThreadLocal<Integer> DISABLE_DEPTH = ThreadLocal.withInitial(() -> 0);

    @Around("@within(org.springframework.stereotype.Service) || @within(org.springframework.transaction.annotation.Transactional) || @annotation(org.springframework.transaction.annotation.Transactional)")
    public Object handleSoftDeleteFilter(ProceedingJoinPoint joinPoint) throws Throwable {
        Session session = null;
        try {
            session = entityManager.unwrap(Session.class);
        } catch (Exception e) {
            // JPA/Hibernate를 사용하지 않는 환경(예: 단순 유닛 테스트 등)에서는 그냥 메서드를 통과시킵니다.
            return joinPoint.proceed();
        }

        boolean hasDisableAnnotation = hasDisableSoftDeleteAnnotation(joinPoint);
        int currentCallDepth = CALL_DEPTH.get() + 1;
        CALL_DEPTH.set(currentCallDepth);
        int currentDisableDepth = DISABLE_DEPTH.get() + (hasDisableAnnotation ? 1 : 0);
        if (hasDisableAnnotation) {
            DISABLE_DEPTH.set(currentDisableDepth);
        }

        if (currentDisableDepth > 0) {
            log.debug(">>> SoftDelete disabled for method: {}", joinPoint.getSignature().toShortString());
            session.disableFilter(FILTER_NAME);
        } else {
            // 기본 조건으로 필터 활성화 (use_yn = 'Y' 인 데이터만 조회)
            session.enableFilter(FILTER_NAME).setParameter("useYn", "Y");
        }

        try {
            return joinPoint.proceed();
        } finally {
            int remainingDisableDepth = hasDisableAnnotation ? currentDisableDepth - 1 : currentDisableDepth;
            int remainingCallDepth = currentCallDepth - 1;
            if (remainingCallDepth <= 0) {
                CALL_DEPTH.remove();
                DISABLE_DEPTH.remove();
            } else {
                CALL_DEPTH.set(remainingCallDepth);
                if (hasDisableAnnotation) {
                    DISABLE_DEPTH.set(remainingDisableDepth);
                }
            }
            // 중첩된 @DisableSoftDelete 문맥이 남아 있으면 비활성 상태를 유지하고, 최외곽 또는 일반 문맥으로 복귀하면 기본 필터를 복구한다.
            if (session != null && session.isOpen()) {
                if (remainingDisableDepth > 0) {
                    session.disableFilter(FILTER_NAME);
                } else {
                    session.enableFilter(FILTER_NAME).setParameter("useYn", "Y");
                }
            }
        }
    }

    private boolean hasDisableSoftDeleteAnnotation(ProceedingJoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();

        // 1. 메서드에 어노테이션이 존재하는지 확인
        if (method.isAnnotationPresent(DisableSoftDelete.class)) {
            return true;
        }

        // 2. 클래스 타입에 어노테이션이 존재하는지 확인
        Class<?> targetClass = joinPoint.getTarget().getClass();
        if (targetClass.isAnnotationPresent(DisableSoftDelete.class)) {
            return true;
        }

        return false;
    }
}
