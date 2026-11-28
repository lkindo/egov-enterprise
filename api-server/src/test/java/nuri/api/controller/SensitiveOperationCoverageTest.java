package nuri.api.controller;

import nuri.foundation.core.annotation.SensitiveOperation;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 계정의 접속을 바꾸는 쓰기는 민감 작업 감사 원장에 남는다. 원장 기록은 {@code @SensitiveOperation}·{@code @PrivacyAccess}
 * 표지가 있는 핸들러만 대상이다(SensitiveAuditInterceptor). 표지를 빼면 이 시험이 붉다.
 *
 * <p>이 시험은 모든 생성물에 남으므로 core 컨트롤러만 적는다. 문자열 클래스 이름은 생성기의 import 연쇄 제거에 걸리지 않아,
 * 기능이 소유한 컨트롤러를 적으면 그 기능이 빠진 구성에서 실행 중에 실패한다. 기능 컨트롤러는 그 기능의 시험이 본다
 * (결재: ApprovalApiControllerTest).
 */
class SensitiveOperationCoverageTest {

    @ParameterizedTest(name = "{1}")
    @CsvSource(delimiter = '|', value = {
            "nuri.api.controller.UserApiController|deleteUser|사용자 삭제",
            "nuri.api.controller.UserApiController|deleteUsers|사용자 일괄 삭제",
            "nuri.api.controller.UserApiController|unlockUser|계정 잠금 해제",
            "nuri.api.controller.UserApiController|updateUsersStatus|계정 상태 일괄 변경",
            "nuri.api.controller.UserApiController|updateUsersRole|사용자 권한 일괄 변경",
            "nuri.api.controller.foundation.controller.system.login.LoginPolicyApiController|insertLoginPolicy|로그인 정책 등록",
            "nuri.api.controller.foundation.controller.system.login.LoginPolicyApiController|updateLoginPolicy|로그인 정책 변경",
            "nuri.api.controller.foundation.controller.system.login.LoginPolicyApiController|deleteLoginPolicy|로그인 정책 삭제",
            "nuri.api.controller.foundation.controller.system.user.UserAbsenceApiController|updateAbsence|부재·대리결재 지정",
            "nuri.api.controller.foundation.controller.system.policy.PolicyApiController|createPolicy|시스템 정책 등록",
            "nuri.api.controller.foundation.controller.system.policy.PolicyApiController|updatePolicy|시스템 정책 수정",
    })
    void accountAccessWritesAreRecordedInTheSensitiveAuditLedger(String controller, String handlerName, String description)
            throws ClassNotFoundException {
        List<Method> handlers = Arrays.stream(Class.forName(controller).getDeclaredMethods())
                .filter(method -> method.getName().equals(handlerName))
                .toList();

        assertThat(handlers).as(controller + "#" + handlerName).hasSize(1);
        SensitiveOperation marker = handlers.getFirst().getAnnotation(SensitiveOperation.class);
        assertThat(marker).as(controller + "#" + handlerName + " 의 민감 작업 표지").isNotNull();
        assertThat(marker.value()).isEqualTo(description);
    }
}
