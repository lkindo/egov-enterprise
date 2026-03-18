package com.company.project.api.controller.system.policy;

import com.company.project.service.system.policy.PolicyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("PolicyApiController 단위 테스트")
class PolicyApiControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private PolicyService policyService;

    @InjectMocks
    private PolicyApiController policyApiController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(policyApiController).build();
    }

    @Test
    @DisplayName("개인정보보호정책 조회 테스트")
    void getPrivacyPolicyTest() throws Exception {
        PolicyService.Policy policy = PolicyService.Policy.builder()
                .title("Privacy Policy")
                .content("Test Content")
                .build();
        when(policyService.getPolicy("privacy")).thenReturn(Optional.of(policy));

        mockMvc.perform(get("/api/v1/admin/system/policies/privacy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Privacy Policy"));
    }

    @Test
    @DisplayName("정책 업데이트 테스트")
    void updatePolicyTest() throws Exception {
        Map<String, String> body = Map.of("title", "Updated Policy", "content", "Updated Content");

        mockMvc.perform(put("/api/v1/admin/system/policies/privacy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
