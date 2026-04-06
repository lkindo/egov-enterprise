package nuri.business.api.controller.knowledge;

import nuri.business.service.knowledge.KnowledgeService;
import nuri.business.service.knowledge.dto.KnowledgeDto;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import java.util.Collections;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class KnowledgeApiControllerTest {

    private MockMvc mockMvc;
    private KnowledgeService knowledgeService;
    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        knowledgeService = mock(KnowledgeService.class);
        
        HandlerMethodArgumentResolver userDetailsResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType().equals(UserDetails.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                        NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                UserDetails user = mock(UserDetails.class);
                when(user.getUsername()).thenReturn("knowledgeAdmin");
                return user;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(new KnowledgeApiController(knowledgeService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver(), userDetailsResolver)
                .build();
    }

    @Test
    @DisplayName("지식 목록 조회 - 성공")
    void getKnowledgeList_success() throws Exception {
        when(knowledgeService.getKnowledgeList(any(), any())).thenReturn(new PageImpl<>(Collections.emptyList()));
        mockMvc.perform(get("/api/v1/admin/digital-assets").param("searchWrd", "test")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("지식 상세 조회 - 성공")
    void getKnowledge_success() throws Exception {
        when(knowledgeService.getKnowledge("K1")).thenReturn(KnowledgeDto.builder().build());
        mockMvc.perform(get("/api/v1/admin/digital-assets/K1")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("지식 등록/수정/삭제 - 성공")
    void knowledge_crud_success() throws Exception {
        KnowledgeDto dto = KnowledgeDto.builder().build();
        when(knowledgeService.createKnowledge(anyString(), any())).thenReturn("K_NEW");

        mockMvc.perform(post("/api/v1/admin/digital-assets")
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/v1/admin/digital-assets/K1")
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/admin/digital-assets/K1")).andExpect(status().isOk());
    }
}
