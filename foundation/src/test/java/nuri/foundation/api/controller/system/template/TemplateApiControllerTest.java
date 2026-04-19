package nuri.foundation.api.controller.system.template;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.domain.template.Template;
import nuri.foundation.service.template.TmplatInfoService;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("TemplateApiController 테스트")
class TemplateApiControllerTest {

    private MockMvc mockMvc;

    @Mock
    private TmplatInfoService tmplatInfoService;

    @InjectMocks
    private TemplateApiController templateApiController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockMvc = MockMvcBuilders.standaloneSetup(templateApiController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("템플릿 목록 조회 성공")
    void testSelectTmplatInfoList() throws Exception {
        when(tmplatInfoService.selectTmplatInfoList()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/admin/system/templates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("템플릿 상세 조회 성공")
    void testSelectTmplatInfoDetail() throws Exception {
        Template tmplat = Template.builder()
                .tmplatId("TMPLT_001")
                .build();
        when(tmplatInfoService.selectTmplatInfoDetail("TMPLT_001")).thenReturn(tmplat);

        mockMvc.perform(get("/api/v1/admin/system/templates/TMPLT_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tmplatId").value("TMPLT_001"));
    }

    @Test
    @DisplayName("템플릿 등록 성공")
    void testInsertTmplatInfo() throws Exception {
        Template tmplat = Template.builder()
                .tmplatNm("New Template")
                .build();

        mockMvc.perform(post("/api/v1/admin/system/templates")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(tmplat)))
                .andExpect(status().isOk());
    }
}
