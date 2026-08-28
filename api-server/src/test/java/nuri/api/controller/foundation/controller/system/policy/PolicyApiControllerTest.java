package nuri.api.controller.foundation.controller.system.policy;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.business.service.system.policy.PolicyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("PolicyApiController 테스트")
class PolicyApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PolicyService policyService;

    @InjectMocks
    private PolicyApiController policyApiController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(policyApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("정책 목록 조회 성공")
    void testGetPolicies() throws Exception {
        when(policyService.getPolicies()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/admin/system/policies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("정책 상세 조회 성공 - 데이터 있음")
    void testGetPolicy_WithData() throws Exception {
        PolicyService.Policy policy = PolicyService.Policy.builder()
                .plcyTypeCd("copyright")
                .plcyTtl("저작권")
                .plcyCn("내용")
                .build();
        when(policyService.getPolicy("copyright")).thenReturn(Optional.of(policy));

        mockMvc.perform(get("/api/v1/admin/system/policies/copyright"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plcyTtl").value("저작권"))
                .andExpect(jsonPath("$.data.plcyCn").value("내용"))
                .andExpect(jsonPath("$.data.plcyTypeCd").value("copyright"));
    }

    /**
     * [2026-08-28] 이 두 테스트는 **틀린 동작을 동결하고 있었다.**
     *
     * <p>종전 컨트롤러는 등록된 정책이 없으면 본문을 <b>지어내서</b> 200 으로 돌려줬고, 이
     * 테스트들이 그것을 정상으로 검증했다. 특히 {@code privacy} 는 "본 시스템은 사용자의
     * 개인정보를 소중히 다루며, 관련 법규를 준수합니다." 라는 <b>개인정보 처리 방침</b>을
     * 만들어 냈다 — 신규 설치의 기본 상태가 "가짜 법적 문서를 진짜처럼 게시" 였다.
     *
     * <p>관리자도 구분할 수 없었다. 편집 화면이 같은 응답을 읽으므로 화면의 본문이 저장된
     * 것인지 서버가 만든 것인지 알 방법이 없었다.
     *
     * <p>없는 문서는 없다고 해야 한다. 계약을 404 로 뒤집는다.
     */
    @Test
    @DisplayName("미등록 정책은 본문을 지어내지 않고 404 다 (copyright)")
    void testGetPolicy_unregisteredCopyrightIsNotFound() throws Exception {
        when(policyService.getPolicy("copyright")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/admin/system/policies/copyright"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("미등록 개인정보처리방침을 만들어 내지 않는다 — 가장 위험한 축")
    void testGetPolicy_unregisteredPrivacyIsNotFound() throws Exception {
        when(policyService.getPolicy("privacy")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/admin/system/policies/privacy"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("등록된 정책은 그대로 돌려준다 — 404 전환이 정상 경로를 깨지 않는다")
    void testGetPolicy_registeredStillReturns() throws Exception {
        when(policyService.getPolicy("privacy")).thenReturn(Optional.of(
                nuri.business.service.system.policy.PolicyService.Policy.builder()
                        .plcyTypeCd("privacy")
                        .plcyTtl("우리 기관 개인정보 처리 방침")
                        .plcyCn("실제로 등록된 본문")
                        .build()));

        mockMvc.perform(get("/api/v1/admin/system/policies/privacy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plcyTtl").value("우리 기관 개인정보 처리 방침"))
                .andExpect(jsonPath("$.data.plcyCn").value("실제로 등록된 본문"));
    }

    @Test
    @DisplayName("정책 수정 성공 - 화면 계약(plcyTtl/plcyCn)")
    void testUpdatePolicy() throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/policies/copyright")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"plcyTtl\":\"New Title\", \"plcyCn\":\"New Content\"}"))
                .andExpect(status().isOk());

        org.mockito.Mockito.verify(policyService).updatePolicy("copyright", "New Title", "New Content");
    }

    @Test
    @DisplayName("[회귀] 구(舊) 계약(title/content)은 400 — 본문 무음 소실 재발 차단")
    void testUpdatePolicy_legacyPayloadRejected() throws Exception {
        // 과거 컨트롤러는 Map 으로 title/content 를 읽어, 화면이 보내는 plcyTtl/plcyCn 을
        // 조용히 버리고 제목=타입코드·본문=빈문자열로 덮어썼다(성공 토스트까지 떴다).
        // 이제는 계약 불일치가 400 으로 드러나야 한다.
        mockMvc.perform(put("/api/v1/admin/system/policies/copyright")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"New Title\", \"content\":\"New Content\"}"))
                .andExpect(status().isBadRequest());

        org.mockito.Mockito.verify(policyService, org.mockito.Mockito.never())
                .updatePolicy(org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString(),
                        org.mockito.ArgumentMatchers.anyString());
    }
}
