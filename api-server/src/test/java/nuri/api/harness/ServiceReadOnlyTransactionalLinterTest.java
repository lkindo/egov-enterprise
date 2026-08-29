package nuri.api.harness;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🔗 서비스 트랜잭션 경계 표준 린터 — §2.C(횡단관심사 체계화) 트랜잭션 경계 규약.
 *
 * <p>[근거] quality-score §2.C: 트랜잭션 경계가 관례가 아니라 임기응변으로 적용됨. 코드베이스 규범은
 * <b>@Service 클래스레벨 {@code @Transactional(readOnly = true)}</b> + 쓰기 메서드만 메서드레벨
 * {@code @Transactional} 오버라이드다(감사 실측 ≈91% 준수). 그러나 이를 강제하는 게이트가 없어 신규
 * @Service 가 readOnly 를 누락해도 무음 통과하며, 이는 flush 타이밍/dirty-checking 부작용의 조용한 소스가 된다.
 *
 * <p>[규칙] {@code @Service} 클래스는 클래스레벨 {@code @Transactional(readOnly = true)} 를 보유해야 한다.
 * 쓰기 메서드의 메서드레벨 오버라이드는 규칙과 정합(클래스레벨만 검사). 기존 미준수 서비스는
 * {@link #GRANDFATHERED} 베이스라인으로 <b>동결(무행동=무위험)</b> → 목록에 없는 <b>신규 미준수만 위반</b>.
 * 동결 서비스는 별도로 readOnly 적정성을 검토한다(파일 IO·쓰기 전용·REQUIRES_NEW 등 정당한 예외 포함).
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(컴포넌트 클래스패스 스캔·리플렉션).
 */
@Tag("governance-harness")
class ServiceReadOnlyTransactionalLinterTest {

    private static final Logger log = LoggerFactory.getLogger(ServiceReadOnlyTransactionalLinterTest.class);
    private static final String SERVICE_SCAN_BASE = "nuri";

    /**
     * [동결 베이스라인] 클래스레벨 @Transactional(readOnly=true) 를 갖지 않은 기존 @Service.
     * 파일 IO/쓰기 전용/별도 tx 등 정당한 예외와, readOnly 검토가 필요한 잔여가 섞여 있다. <b>신규 추가 금지</b> —
     * 신규 @Service 는 클래스레벨 readOnly=true 를 사용하고, 불가피하면 사유와 함께 이 목록에 추가한다.
     * (1차 census 실행으로 채운다 — 엔티티 단순명 기준)
     */
    private static final Set<String> GRANDFATHERED = new TreeSet<>(Arrays.asList(
            // [동결 2026-07-18, 축소 2026-08-30] 클래스레벨 readOnly 누락 @Service 11종 중
            // 조회 경계가 명확한 5종(CommonCode·InstitutionCode·LoginLogManage·MenuIntegration·
            // CustomUserDetails)은 클래스 기본 readOnly + 쓰기 메서드 override로 정렬했다.
            // 성격: 쓰기 전용/카운터(BoardViewCountService·OtpService), 파일 IO(LocalFileStorageService·
            // 정당한 무-tx), 쓰기 혼재(BoardService·CommentService), 비-DB 실시간 카운터(RealTimeDashboardService).
            // 신규 추가 금지 — 신규 @Service 는 클래스레벨 readOnly=true 사용.
            "BoardService", "BoardViewCountService", "CommentService", "LocalFileStorageService",
            "OtpService", "RealTimeDashboardService"
    ));

    @Test
    @DisplayName("🔗 신규 @Service 는 클래스레벨 @Transactional(readOnly=true) 사용 — tx 경계 드리프트 차단 (§2.C)")
    void auditServicesDeclareClassLevelReadOnly() {
        List<String> nonReadOnly = new ArrayList<>();
        int totalServices = 0;

        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Service.class));
        for (var bd : scanner.findCandidateComponents(SERVICE_SCAN_BASE)) {
            String className = bd.getBeanClassName();
            try {
                Class<?> clazz = Class.forName(className);
                totalServices++;
                Transactional txn = AnnotationUtils.findAnnotation(clazz, Transactional.class);
                boolean classReadOnly = txn != null && txn.readOnly();
                if (!classReadOnly) {
                    nonReadOnly.add(clazz.getSimpleName());
                }
            } catch (ClassNotFoundException | LinkageError ex) {
                log.warn("[ServiceReadOnlyGate] 서비스 로드 실패(스캔 제외): {} ({})", className, ex.getMessage());
            }
        }

        // 게이트 무결성(false-green 방지): 스캔이 조용히 0에 수렴하면 vacuous 통과가 되므로 차단.
        if (totalServices < 20) {
            fail("게이트 무결성 파손: @Service 스캔 건수(" + totalServices + ")가 예상 하한(20) 미만 — 스캔/클래스패스 파손 의심.");
        }

        List<String> violations = nonReadOnly.stream()
                .filter(name -> !GRANDFATHERED.contains(name))
                .sorted()
                .collect(Collectors.toList());
        List<String> staleGrandfathered = GRANDFATHERED.stream()
                .filter(name -> !nonReadOnly.contains(name))
                .sorted()
                .collect(Collectors.toList());

        if (!violations.isEmpty() || !staleGrandfathered.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("\n========================================================================\n");
            sb.append("🔗 [SERVICE READONLY GATE] 클래스레벨 @Transactional(readOnly=true) 누락 @Service 감지!\n");
            sb.append("========================================================================\n");
            for (String v : violations) {
                sb.append("❌ ").append(v).append(" — 클래스레벨 @Transactional(readOnly=true) 부재\n");
            }
            for (String stale : staleGrandfathered) {
                sb.append("❌ ").append(stale).append(" — 이미 정렬됐거나 제거된 stale GRANDFATHERED 항목\n");
            }
            sb.append("\n💡 §2.C: @Service 는 클래스레벨 @Transactional(readOnly=true), 쓰기 메서드만 메서드레벨 오버라이드.\n");
            sb.append("   정당한 예외(파일 IO·쓰기 전용 등)면 사유와 함께 ServiceReadOnlyTransactionalLinterTest.GRANDFATHERED 에 추가.\n");
            sb.append("   (현재 readOnly 누락 @Service 전체: ").append(nonReadOnly.stream().sorted().collect(Collectors.toList())).append(")\n");
            fail(sb.toString());
        } else {
            log.info("✅ 신규 readOnly 누락 @Service 없음(스캔 {}건, 동결 {}건). tx 경계 규약 준수.",
                    totalServices, GRANDFATHERED.size());
        }
    }
}
