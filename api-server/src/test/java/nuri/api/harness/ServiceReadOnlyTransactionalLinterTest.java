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
            // 신규 추가 금지 — 신규 @Service 는 클래스레벨 readOnly=true 사용.
            //
            // [사유 결속 2026-09-03] 종전에는 여섯 항목의 성격이 한 덩어리 문장에 뭉쳐 있었고 그중
            // OtpService 분류가 틀렸다(쓰기 전용/카운터가 아니라 DB 미접근이다). 외부 감사가 이 여섯을
            // "단순 검증/파싱 위주" 로 묶어 전부 readOnly 를 붙이라고 권고한 일이 있어, 항목별 사유와
            // **붙였을 때 무슨 일이 생기는지**를 각 줄에 남긴다.
            //
            // ⚠ 이 목록에서 항목을 지우는 것은 해소가 아니다. stale 판정은 "대상이 readOnly 를 갖게
            // 됐다" 는 뜻이고, 아래 BoardViewCountService 처럼 붙이면 안 되는 대상이 섞여 있다.
            // stale 이 떴다면 먼저 그 클래스에 readOnly 가 왜 붙었는지부터 확인한다.

            // 쓰기 혼재 — 조회와 쓰기가 한 서비스에 있고 메서드 레벨로 경계를 잡는다.
            "BoardService",

            // ⛔ readOnly 를 붙이면 조회수 반영이 죽는다. @Scheduled syncViewCountsToDb 가 읽기전용
            //    트랜잭션을 열면, REQUIRED 인 BoardRepository#increaseInqCntAtomic(@Modifying 네이티브
            //    UPDATE)이 그 트랜잭션에 참여해 PostgreSQL 이 UPDATE 를 거부한다. catch 가 예외를
            //    삼키므로 조회수는 영구 0 이 되고 버퍼만 늘어난다 — 테스트는 H2 라 CI 는 green 이다.
            //    건별 트랜잭션은 결함 수정으로 **의도적으로** 도입한 설계다(서비스 javadoc 참조).
            "BoardViewCountService",

            // 쓰기 혼재 — BoardService 와 같은 축.
            "CommentService",

            // DB 미접근 — 파일 IO 전용. Repository·EntityManager 주입이 0 이라 트랜잭션을 열 대상이 없다.
            "LocalFileStorageService",

            // DB 미접근 — 필드가 GoogleAuthenticator 하나뿐이고 전 메서드가 라이브러리 호출이다.
            //    (2026-09-03 정정: 종전 주석은 이 클래스를 '쓰기 전용/카운터' 로 분류했으나 사실이 아니다.)
            "OtpService",

            // 비-DB 실시간 카운터 — 방송 주기에 AtomicInteger 를 읽고, 알림 건수만 리포지토리로 센다.
            "RealTimeDashboardService"
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
                sb.append("❌ ").append(stale).append(" — 동결 항목인데 클래스레벨 readOnly 를 갖게 되었거나 제거됨(stale)\n");
                sb.append("     ⚠ 목록에서 지우기 전에 그 클래스에 readOnly 가 왜 붙었는지 먼저 확인하십시오.\n");
                sb.append("       동결 사유(GRANDFATHERED 주석)에 '붙이면 안 되는' 대상이 섞여 있습니다 —\n");
                sb.append("       예: BoardViewCountService 는 읽기전용 tx 안에서 네이티브 UPDATE 가 거부되어\n");
                sb.append("       조회수 반영이 조용히 죽습니다(H2 테스트 프로파일은 이를 재현하지 못합니다).\n");
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
