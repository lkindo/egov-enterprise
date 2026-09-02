package nuri.api.harness;

import nuri.foundation.core.annotation.PrivacyAccess;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.web.bind.annotation.RequestMapping;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * 🧾 개인정보 접근 증적 census — {@link PrivacyAccess} 부착 지점을 <b>양방향</b>으로 동결한다.
 *
 * <p>[왜 필요한가] {@code tb_privacy_log} 는 컴플라이언스 증적이다. 무엇이 기록되는지가
 * 코드 어딘가에 흩어져 있으면 두 방향으로 조용히 깨진다.
 * <ul>
 *   <li><b>누락</b> — 개인정보를 새로 노출하는 엔드포인트를 만들고 애노테이션을 빠뜨리면
 *       증적 없이 조회가 일어난다. 화면은 정상이라 아무도 눈치채지 못한다.</li>
 *   <li><b>삭제</b> — 기존 애노테이션을 지우면 기록이 멈추는데, 표가 비어 가는 것은
 *       "접근이 없었다"로 오독된다.</li>
 * </ul>
 * 그래서 부착 지점의 <b>정확한 집합</b>을 여기에 동결하고, 늘거나 줄면 red 로 만든다.
 *
 * <p><b>이 목록을 고칠 때 함께 판단할 것.</b> 본인 정보 조회(마이페이지)는 대상이 아니다 —
 * 자기 정보 열람을 증적에 섞으면 타인 조회 기록이 희석된다. 반대로 응답에 타인의 주민등록번호·
 * 연락처·주소·생년월일이 새로 실리면 반드시 등재해야 한다.
 *
 * <p>Spring 컨텍스트를 띄우지 않는 순수 정적 테스트(컴포넌트 클래스패스 스캔·리플렉션).
 */
@Tag("governance-harness")
@DisplayName("개인정보 접근 증적 census")
class PrivacyAccessCensusLinterTest {

    private static final Logger log = LoggerFactory.getLogger(PrivacyAccessCensusLinterTest.class);
    private static final String SCAN_BASE = "nuri";

    /**
     * 개인정보 접근으로 <b>선언된</b> 핸들러 전수. {@code 클래스#메서드} 표기.
     *
     * <p>여기에 없는 부착도, 여기 있는데 사라진 부착도 모두 위반이다.
     */
    private static final Set<String> DECLARED_PRIVACY_HANDLERS = Set.of(
            "UserApiController#getUsers",
            "UserApiController#getUser",
            "ExternalHrApiController#getAllExternalHr");

    @Test
    @DisplayName("🔒 @PrivacyAccess 부착 지점이 선언 census 와 정확히 일치한다")
    void privacyAccessHandlersMatchDeclaredCensus() {
        Set<String> actual = new TreeSet<>();
        int controllerCount = 0;

        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(true);
        for (var bd : scanner.findCandidateComponents(SCAN_BASE)) {
            String className = bd.getBeanClassName();
            try {
                Class<?> clazz = Class.forName(className);
                if (AnnotationUtils.findAnnotation(clazz, RequestMapping.class) == null) {
                    continue;
                }
                controllerCount++;
                for (Method m : clazz.getDeclaredMethods()) {
                    PrivacyAccess annotation = AnnotationUtils.findAnnotation(m, PrivacyAccess.class);
                    if (annotation != null) {
                        assertThat(annotation.value())
                                .as("%s#%s 의 조회 항목 서술은 비어 있을 수 없다", clazz.getSimpleName(), m.getName())
                                .isNotBlank();
                        actual.add(clazz.getSimpleName() + "#" + m.getName());
                    }
                }
            } catch (ClassNotFoundException | LinkageError ex) {
                log.warn("[PrivacyAccessCensus] 컴포넌트 로드 실패(스캔 제외): {} ({})", className, ex.getMessage());
            }
        }

        // 게이트 무결성(false-green 방지): 컨트롤러 스캔이 조용히 0으로 수렴하면 census 는
        //   "부착 0건 == 선언 0건" 으로 vacuous 통과할 수 있다. 실측 컨트롤러는 60개대다.
        if (controllerCount < 30) {
            fail("게이트 무결성 파손: 컨트롤러 스캔 건수(" + controllerCount + ")가 하한(30) 미만입니다. "
                    + "스캔 경로가 끊겼는지 확인하십시오.");
        }

        List<String> missing = new ArrayList<>(DECLARED_PRIVACY_HANDLERS);
        missing.removeAll(actual);
        List<String> unexpected = new ArrayList<>(actual);
        unexpected.removeAll(DECLARED_PRIVACY_HANDLERS);

        if (!missing.isEmpty() || !unexpected.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("🔒 [PRIVACY-ACCESS CENSUS] 개인정보 접근 증적 부착 지점이 선언과 어긋납니다.\n");
            if (!unexpected.isEmpty()) {
                sb.append("   · census 에 없는 신규 부착: ").append(unexpected).append('\n');
                sb.append("     → 의도한 추가라면 DECLARED_PRIVACY_HANDLERS 에 등재하십시오.\n");
            }
            if (!missing.isEmpty()) {
                sb.append("   · 선언됐지만 사라진 부착: ").append(missing).append('\n');
                sb.append("     → 증적이 멈춥니다. 제거가 의도라면 사유와 함께 census 에서 지우십시오.\n");
            }
            fail(sb.toString());
        }
    }
}
