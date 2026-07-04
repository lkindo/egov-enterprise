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

        // BE-02 fix: 진입 시점의 필터 상태를 저장해 finally 에서 정확히 복원한다.
        // (무조건 재활성화하면 중첩 호출 시 바깥 @DisableSoftDelete 스코프가 오염된다.)
        boolean wasEnabledOnEntry = session.getEnabledFilter(FILTER_NAME) != null;

        if (hasDisableAnnotation) {
            log.debug(">>> SoftDelete disabled for method: {}", joinPoint.getSignature().toShortString());
            session.disableFilter(FILTER_NAME);
        } else {
            // 기본 조건으로 필터 활성화 (use_yn = 'Y' 인 데이터만 조회)
            session.enableFilter(FILTER_NAME).setParameter("useYn", "Y");
        }

        try {
            return joinPoint.proceed();
        } finally {
            // 진입 시점 상태로 정확히 복원 (중첩 호출 시 바깥 스코프 오염 방지).
            if (session != null && session.isOpen()) {
                if (wasEnabledOnEntry) {
                    session.enableFilter(FILTER_NAME).setParameter("useYn", "Y");
                } else {
                    session.disableFilter(FILTER_NAME);
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
