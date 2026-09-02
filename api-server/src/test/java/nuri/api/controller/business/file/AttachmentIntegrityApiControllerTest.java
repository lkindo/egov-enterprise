package nuri.api.controller.business.file;

import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.file.AttachmentIntegrityService;
import nuri.business.service.file.dto.AttachmentIntegrityReport;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 첨부 정합성 진단 API 검증 — 컨트롤러 테스트가 <b>하나도 없던</b> 엔드포인트다.
 *
 * <p>이 응답에는 <b>저장소 절대 경로</b>({@code storageRoot})와 어긋난 파일 표본이 실린다.
 * 서버 내부 경로는 공격자에게 유용한 정보이므로 인가 축이 특히 중요하고, 그 인가가
 * 메서드 애노테이션 한 줄에 걸려 있다.
 */
@WebMvcTest(AttachmentIntegrityApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AttachmentIntegrityApiController 테스트")
class AttachmentIntegrityApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private AttachmentIntegrityService attachmentIntegrityService;

    private static AttachmentIntegrityReport report(long missing, long orphanCandidates) {
        return new AttachmentIntegrityReport(
                120L, missing, List.of("general/7/report.pdf"), "/app/storage/uploads",
                118L, orphanCandidates, 2L, List.of("general/9"));
    }

    @Test
    @WithMockCustomUser(username = "admin", esntlId = "admin", role = "ADMIN")
    @DisplayName("점검 결과를 양방향(실물 부재·고아 후보) 모두 실어 돌려준다")
    void scan_returnsBothDirections() throws Exception {
        given(attachmentIntegrityService.scan()).willReturn(report(3L, 5L));

        mockMvc.perform(get("/api/v1/admin/files/integrity").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                // DB→저장소 방향(실물 부재)과 저장소→DB 방향(고아 후보)이 함께 있어야
                // 관리자가 "어느 쪽이 어긋났는지" 를 판정할 수 있다.
                .andExpect(jsonPath("$.data.missing").value(3))
                .andExpect(jsonPath("$.data.orphanCandidates").value(5))
                .andExpect(jsonPath("$.data.undecidable").value(2))
                .andExpect(jsonPath("$.data.storageRoot").value("/app/storage/uploads"));
    }

    /**
     * 고아 <b>후보</b>는 커밋 전 업로드와 저장소에서 완전히 같은 모습이라 확정할 수 없다.
     * 후보가 있다는 이유로 건강하지 않다고 보고하면 경보가 무시된다.
     */
    @Test
    @DisplayName("고아 후보만 있고 실물 부재가 없으면 건강한 상태다")
    void healthyWhenOnlyOrphanCandidatesExist() {
        assertThat(report(0L, 9L).isHealthy()).isTrue();
        assertThat(report(1L, 0L).isHealthy()).isFalse();
    }

    /**
     * 이 엔드포인트의 인가는 {@code @AdminOrSystem} 메서드 애노테이션 <b>한 줄</b>에 걸려 있다.
     * 그 줄이 사라지면 서버 저장소 경로가 인증 사용자 전원에게 열린다 — URL 게이트만으로는
     * 막히지 않는 경로이므로 애노테이션의 존재 자체를 계약으로 고정한다.
     */
    @Test
    @DisplayName("점검 엔드포인트는 ADMIN/SYSTEM 메서드 인가를 유지한다")
    void scanKeepsAdminOrSystemMethodSecurity() throws NoSuchMethodException {
        assertThat(AttachmentIntegrityApiController.class.getMethod("scan")
                .isAnnotationPresent(nuri.foundation.security.annotation.AdminOrSystem.class))
                .as("@AdminOrSystem 이 사라지면 저장소 절대 경로가 인증 사용자 전원에게 노출된다")
                .isTrue();
    }
}
