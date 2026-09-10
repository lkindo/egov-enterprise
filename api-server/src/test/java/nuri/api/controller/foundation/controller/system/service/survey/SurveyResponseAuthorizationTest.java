package nuri.api.controller.foundation.controller.system.service.survey;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Exact operation grants separate participation, response reading and destructive deletion.
 * Initial group fixtures preserve the reviewed bootstrap grants; group names do not authorize calls.
 */
@DisplayName("설문 응답 API 인가 등급 고정")
class SurveyResponseAuthorizationTest {

    private static Method handler(Class<?> type, String name) {
        return Arrays.stream(type.getDeclaredMethods())
                .filter(m -> m.getName().equals(name))
                .findFirst()
                .orElseThrow(() -> new AssertionError(type.getSimpleName() + "." + name + " 핸들러가 없다"));
    }

    @Test
    @DisplayName("기본 사용자 참여 권한과 조회 권한은 각각 명시적이다")
    void submissionApiIsAuthenticated() {
        nuri.security.support.MethodPermissionContract.assertOperation(handler(SurveySubmissionApiController.class, "getStats"), "SURVEY_READ", false);
        nuri.security.support.MethodPermissionContract.assertOperation(handler(SurveySubmissionApiController.class, "submit"), "SURVEY_SUBMIT", false);
    }

    @Test
    @DisplayName("응답 열람은 일반 참여 권한과 구분한다")
    void adminReadIsAdminOrSystem() {
        nuri.security.support.MethodPermissionContract.assertOperation(handler(SurveyResponseAdminApiController.class, "getResponses"), "SURVEY_RSP_READ", false);
        nuri.security.support.MethodPermissionContract.assertOperation(handler(SurveyResponseAdminApiController.class, "getResponse"), "SURVEY_RSP_READ", false);
    }

    @Test
    @DisplayName("응답 열람 권한만으로는 응답을 삭제할 수 없다")
    void adminDeleteIsAdminOnly() {
        var method = handler(SurveyResponseAdminApiController.class, "deleteResponse");
        nuri.security.support.MethodPermissionContract.assertOperation(method, "SURVEY_RSP_DELETE", false);
        var reader = nuri.security.support.MethodPermissionContract.authentication(List.of("OPERATIONS_TEAM"), "SURVEY_RSP_READ");
        assertThat(new nuri.business.security.authorization.PermissionPolicy().allowed(reader,
                method.getDeclaringClass().getName() + "#" + method.getName())).isFalse();
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
