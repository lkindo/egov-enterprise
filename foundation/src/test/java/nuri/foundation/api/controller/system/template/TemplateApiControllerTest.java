package nuri.foundation.api.controller.system.template;

import nuri.foundation.domain.template.Template;
import nuri.foundation.service.template.TmplatInfoService;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TemplateApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("TemplateApiController 테스트")
class TemplateApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private TmplatInfoService tmplatInfoService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("템플릿 목록 조회 성공")
    void selectTmplatInfoList_Success() throws Exception {
        given(tmplatInfoService.selectTmplatInfoList()).willReturn(List.of(Template.builder().tmplatId("TMP_01").build()));

        mockMvc.perform(get("/api/v1/admin/system/templates")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].tmplatId").value("TMP_01"));
    }

    @Test
    @DisplayName("템플릿 상세 조회 성공")
    void selectTmplatInfoDetail_Success() throws Exception {
        given(tmplatInfoService.selectTmplatInfoDetail(anyString())).willReturn(Template.builder().tmplatId("TMP_01").build());

        mockMvc.perform(get("/api/v1/admin/system/templates/TMP_01")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tmplatId").value("TMP_01"));
    }

    @Test
    @DisplayName("템플릿 등록 성공")
    void insertTmplatInfo_Success() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/templates")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tmplatId\":\"TMP_NEW\", \"tmplatNm\":\"New Temp\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
