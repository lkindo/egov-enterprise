package nuri.api.controller.foundation.controller.system.service.survey;

import nuri.foundation.security.annotation.AdminOnly;
import nuri.foundation.security.annotation.AdminOrSystem;
import nuri.foundation.security.annotation.Authenticated;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 설문 응답 API 3종의 인가 등급을 <b>한 곳에서 전수</b> 고정한다.
 *
 * <p>standalone MockMvc 도, 통합 테스트도 {@code @PreAuthorize} 를 강제하지 않는 경로가 있어
 * 애노테이션을 지우거나 넓혀도 기능 테스트는 초록이다. 그래서 애노테이션의 존재 자체를
 * 리플렉션으로 못 박는다.
 *
 * <p><b>등급이 셋으로 갈리는 이유</b>(§0.7-H3 — 도메인 맥락 판정이지 패턴 적용이 아니다):
 * <ul>
 *   <li>{@code @Authenticated} — 참여·통계 열람. 관리 기능이 아니라 일반 사용자의 행위다.</li>
 *   <li>{@code @AdminOrSystem} — 응답 목록·단건. 응답 내용에는 신상이 없다(신상은 응답자 테이블).</li>
 *   <li>{@code @AdminOnly} — 응답 <b>삭제</b>. 되돌릴 수 없고 설문 결과 신뢰성에 직결된다.
 *       열람과 파괴를 같은 등급에 두지 않는다.</li>
 * </ul>
 */
@DisplayName("설문 응답 API 인가 등급 고정")
class SurveyResponseAuthorizationTest {

    private static Method handler(Class<?> type, String name) {
        return Arrays.stream(type.getDeclaredMethods())
                .filter(m -> m.getName().equals(name))
                .findFirst()
                .orElseThrow(() -> new AssertionError(type.getSimpleName() + "." + name + " 핸들러가 없다"));
    }

    private static void assertGrade(Method m, Class<? extends Annotation> expected) {
        List<Class<? extends Annotation>> all = List.of(Authenticated.class, AdminOrSystem.class, AdminOnly.class);
        for (Class<? extends Annotation> a : all) {
            assertThat(m.isAnnotationPresent(a))
                    .as("%s 는 %s 여야 한다 (현재 %s 여부=%s)",
                            m.getName(), expected.getSimpleName(), a.getSimpleName(), m.isAnnotationPresent(a))
                    .isEqualTo(a.equals(expected));
        }
    }

    @Test
    @DisplayName("🔒 참여 API 2종은 @Authenticated — 관리 등급으로 좁히면 일반 사용자가 설문에 답할 수 없다")
    void submissionApiIsAuthenticated() {
        assertGrade(handler(SurveySubmissionApiController.class, "getStats"), Authenticated.class);
        assertGrade(handler(SurveySubmissionApiController.class, "submit"), Authenticated.class);
    }

    @Test
    @DisplayName("🔒 응답 조회는 @AdminOrSystem — @Authenticated 로 열면 타인의 응답이 노출된다")
    void adminReadIsAdminOrSystem() {
        assertGrade(handler(SurveyResponseAdminApiController.class, "getResponses"), AdminOrSystem.class);
        assertGrade(handler(SurveyResponseAdminApiController.class, "getResponse"), AdminOrSystem.class);
    }

    @Test
    @DisplayName("🔒 응답 삭제만 @AdminOnly — 열람 등급으로 넓히면 SYSTEM 롤이 설문 결과를 지울 수 있다")
    void adminDeleteIsAdminOnly() {
        assertGrade(handler(SurveyResponseAdminApiController.class, "deleteResponse"), AdminOnly.class);
    }

    /** 엔드포인트가 늘면 이 단언이 먼저 깨져 인가 검토를 강제한다. */
    @Test
    @DisplayName("핸들러 개수 고정 — 신규 엔드포인트 추가 시 인가 검토를 강제한다")
    void handlerCountIsPinned() {
        assertThat(mappedHandlers(SurveySubmissionApiController.class)).hasSize(2);
        assertThat(mappedHandlers(SurveyResponseAdminApiController.class)).hasSize(3);
    }

    private static List<Method> mappedHandlers(Class<?> type) {
        return Arrays.stream(type.getDeclaredMethods())
                .filter(m -> Arrays.stream(m.getAnnotations())
                        .anyMatch(a -> a.annotationType().getName().startsWith("org.springframework.web.bind")))
                .toList();
    }
}
