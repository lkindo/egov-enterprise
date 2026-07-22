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

    @Test
    @DisplayName("정책 상세 조회 성공 - 기본값 (copyright)")
    void testGetPolicy_DefaultCopyright() throws Exception {
        when(policyService.getPolicy("copyright")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/admin/system/policies/copyright"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plcyTtl").value("저작권 보호 정책"));
    }

    @Test
    @DisplayName("정책 상세 조회 성공 - 기본값 (privacy)")
    void testGetPolicy_DefaultPrivacy() throws Exception {
        when(policyService.getPolicy("privacy")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/admin/system/policies/privacy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plcyTtl").value("개인정보 처리 방침"));
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
