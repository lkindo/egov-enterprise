package nuri.foundation.api.controller.system.policy;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.service.system.policy.PolicyService;
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
import java.util.HashMap;
import java.util.Map;
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
                .andExpect(jsonPath("$.data.title").value("저작권"));
    }

    @Test
    @DisplayName("정책 상세 조회 성공 - 기본값 (copyright)")
    void testGetPolicy_DefaultCopyright() throws Exception {
        when(policyService.getPolicy("copyright")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/admin/system/policies/copyright"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("저작권 보호 정책"));
    }

    @Test
    @DisplayName("정책 상세 조회 성공 - 기본값 (privacy)")
    void testGetPolicy_DefaultPrivacy() throws Exception {
        when(policyService.getPolicy("privacy")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/admin/system/policies/privacy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("개인정보 처리 방침"));
    }

    @Test
    @DisplayName("정책 수정 성공")
    void testUpdatePolicy() throws Exception {
        Map<String, String> policyMap = new HashMap<>();
        policyMap.put("title", "New Title");
        policyMap.put("content", "New Content");

        mockMvc.perform(put("/api/v1/admin/system/policies/copyright")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"New Title\", \"content\":\"New Content\"}"))
                .andExpect(status().isOk());
    }
}
