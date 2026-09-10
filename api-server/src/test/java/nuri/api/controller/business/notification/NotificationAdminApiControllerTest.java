package nuri.api.controller.business.notification;

import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.notification.NotificationService;
import nuri.business.service.notification.dto.NotificationDispatchRequest;
import nuri.business.support.ControllerTestSupport;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 관리자 알림 발송 API 계약(2026-09-06 DEC-OPS-042).
 * 메서드 인가(@AdminOrSystem 존재 — WebMvcTest 슬라이스는 메서드 보안을 활성화하지 않으므로 애노테이션으로 고정하고,
 * 실제 거부는 NotificationServiceTest 의 assertAdmin 계약이 담당)·본문 검증(400)·존재하지 않는 수신자(404)·성공 시 건수 응답을 고정한다.
 */
@WebMvcTest(NotificationAdminApiController.class)
@DisplayName("NotificationAdminApiController 테스트")
class NotificationAdminApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private NotificationService notificationService;

    private static final String VALID_BODY = "{\"recipients\":[{\"esntlId\":\"USRCNFRM_00000000001\"}],"
            + "\"notiTtlNm\":\"점검 안내\",\"notiCn\":\"9월 7일 02:00 시스템 점검\"}";

    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("관리자는 선택한 사용자에게 알림을 보내고 만든 건수를 받는다")
    void dispatch_succeeds() throws Exception {
        given(notificationService.dispatchToUsers(any(NotificationDispatchRequest.class))).willReturn(1);

        mockMvc.perform(post("/api/v1/admin/notifications/dispatch").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(1));

        verify(notificationService).dispatchToUsers(any(NotificationDispatchRequest.class));
    }

    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("수신자가 비었거나 제목이 없으면 400 으로 거절한다 — 서비스에 도달하지 않는다")
    void dispatch_rejectsInvalidBody() throws Exception {
        mockMvc.perform(post("/api/v1/admin/notifications/dispatch").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recipients\":[],\"notiTtlNm\":\"\",\"notiCn\":\"본문\"}"))
                .andExpect(status().isBadRequest());

        verify(notificationService, never()).dispatchToUsers(any());
    }

    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("존재하지 않는 수신자는 404 로 전체가 거부된다")
    void dispatch_unknownRecipientIsNotFound() throws Exception {
        willThrow(new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "수신자로 지정한 사용자를 찾을 수 없습니다."))
                .given(notificationService).dispatchToUsers(any(NotificationDispatchRequest.class));

        mockMvc.perform(post("/api/v1/admin/notifications/dispatch").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("발송은 HTTP와 메서드에서 NOTI_DISPATCH 권한을 확인한다")
    void dispatch_isMethodGuarded() throws Exception {
        Method handler = NotificationAdminApiController.class.getMethod("dispatchNotifications", NotificationDispatchRequest.class);
        nuri.security.support.MethodPermissionContract.assertOperation(handler, "NOTI_DISPATCH", false);
    }
}
