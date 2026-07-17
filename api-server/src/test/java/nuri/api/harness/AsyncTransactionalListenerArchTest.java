package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.event.TransactionalEventListener;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔗 커밋-전-async 재발방지 게이트 — §2.C(횡단관심사 체계화) 트랜잭션 경계 규약.
 *
 * <p>[근거] quality-score §2.C: 트랜잭션 경계가 관례/애스펙트가 아니라 임기응변으로 적용돼 "커밋-전-async"
 * 버그가 재발(scout5 에서 실제 컨텍스트 파손 회귀). 종전 방어는 {@code RestrictedTransactionalEventListenerFactory}
 * 를 인용하는 <b>주석뿐</b>이었으나 감사 결과 <b>그 클래스는 코드베이스에 실존하지 않는(팬텀) 가드</b>였고,
 * {@code @TransactionalEventListener} 실사용도 0건이었다. 즉 "이미 기계로 막혀 있다"는 거짓 안전감만 존재했다.
 * 본 게이트가 그 주석의 주장을 <b>실제 기계강제</b>로 전환한다.
 *
 * <p>[규칙] 한 메서드에 {@code @Async} 와 {@code @TransactionalEventListener} 가 동시에 선언되면 위반이다.
 * 이 조합은 부모 트랜잭션 커밋 <b>전</b>에 별도 스레드/트랜잭션으로 리스너를 기동해 커밋 순서·컨텍스트를
 * 파손시킨다({@code TransactionUtils} javadoc 참조). 커밋-후 부수효과가 필요하면 발행부에서
 * {@code TransactionUtils.runAfterCommit(...)} 로 감싸거나, 동기 {@code @EventListener} +
 * {@code Propagation.MANDATORY} 를 쓴다.
 *
 * <p>{@code @Async} 는 클래스레벨 선언도 메서드 전체에 적용되므로, 리스너 메서드의 선언 클래스에 붙은
 * {@code @Async} 도 조합으로 간주한다. 현재 코드베이스에 이 조합은 0건 → 즉시 green, 신규 도입만 차단.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(컴포넌트 클래스패스 스캔·리플렉션).
 */
class AsyncTransactionalListenerArchTest {

    private static final Logger log = LoggerFactory.getLogger(AsyncTransactionalListenerArchTest.class);
    private static final String SCAN_BASE = "nuri";

    @Test
    @DisplayName("🔗 @Async + @TransactionalEventListener 동시선언 금지 — 커밋-전-async 재발 차단 (§2.C)")
    void forbidAsyncTransactionalEventListenerCombo() {
        List<String> violations = new ArrayList<>();
        int asyncMethodCount = 0;

        // useDefaultFilters=true → @Component/@Service/@Repository/@Controller/@Configuration(메타) 컴포넌트 전수
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(true);
        for (var bd : scanner.findCandidateComponents(SCAN_BASE)) {
            String className = bd.getBeanClassName();
            try {
                Class<?> clazz = Class.forName(className);
                boolean classAsync = AnnotationUtils.findAnnotation(clazz, Async.class) != null;
                for (Method m : clazz.getDeclaredMethods()) {
                    boolean methodAsync = AnnotationUtils.findAnnotation(m, Async.class) != null;
                    if (methodAsync) {
                        asyncMethodCount++;
                    }
                    boolean isTxEventListener =
                            AnnotationUtils.findAnnotation(m, TransactionalEventListener.class) != null;
                    if (isTxEventListener && (methodAsync || classAsync)) {
                        violations.add(clazz.getSimpleName() + "#" + m.getName());
                    }
                }
            } catch (ClassNotFoundException | LinkageError ex) {
                log.warn("[AsyncTxListenerGate] 컴포넌트 로드 실패(스캔 제외): {} ({})", className, ex.getMessage());
            }
        }

        // 게이트 무결성(false-green 방지): @Async 스캔이 조용히 0에 수렴하면 vacuous 통과가 되므로 차단.
        // (현재 @Async 메서드: NotificationEventListener/WebAuditLogListener/LogService/Sms·MailAsyncProcessor/
        //  Sanction·BoardEventListener 등 다수 → 하한 3 은 넉넉한 안전선)
        if (asyncMethodCount < 3) {
            fail("게이트 무결성 파손: @Async 메서드 스캔 건수(" + asyncMethodCount
                    + ")가 예상 하한(3) 미만 — 컴포넌트 스캔/클래스패스 파손 의심.");
        }

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔗 [ASYNC-TX-LISTENER GATE] @Async + @TransactionalEventListener 동시선언 감지 — 커밋-전-async 위험!\n");
            sb.append("========================================================================\n");
            for (String v : violations.stream().sorted().collect(Collectors.toList())) {
                sb.append("❌ ").append(v).append("\n");
            }
            sb.append("\n💡 §2.C: 이 조합은 부모 커밋 전에 리스너를 기동해 컨텍스트/커밋순서를 파손합니다(scout5 회귀).\n");
            sb.append("   커밋-후 부수효과가 필요하면 발행부에서 TransactionUtils.runAfterCommit(...) 로 감싸거나,\n");
            sb.append("   동기 @EventListener + Propagation.MANDATORY 를 사용하십시오.\n");
            fail(sb.toString());
        } else {
            log.info("✅ @Async + @TransactionalEventListener 조합 없음(@Async 메서드 {}건 스캔). 커밋-전-async 규약 준수.",
                    asyncMethodCount);
        }
    }
}
