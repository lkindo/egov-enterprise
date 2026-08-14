package nuri.api.controller.foundation.controller.system.service.survey;

import nuri.business.test.BaseControllerTest;
import nuri.business.service.system.service.survey.SurveyService;
import nuri.business.service.system.service.survey.dto.SurveyInfoDto;
import nuri.business.service.system.service.survey.dto.SurveyTemplateDto;
import nuri.business.service.system.service.survey.dto.SurveyArticleDto;
import nuri.business.service.system.service.survey.dto.SurveyQuestionDto;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class SurveyApiControllerTest extends BaseControllerTest {

    private SurveyService surveyService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        surveyService = mock(SurveyService.class);
        return new SurveyApiController(surveyService);
    }

    // --- Templates ---

    @Test
    public void getTemplates_ShouldReturnPagedTemplates() throws Exception {
        SurveyTemplateDto dto = SurveyTemplateDto.builder()
                .srvyTmpltSn(101L)
                .srvyTmpltExpln("만족도 설문 템플릿")
                .build();
        Page<SurveyTemplateDto> page = new PageImpl<>(Collections.singletonList(dto), PageRequest.of(0, 10), 1);

        when(surveyService.getTmplatList(eq("만족도"), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/surveys/templates")
                .param("keyword", "만족도")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].srvyTmpltSn").value(101))
                .andExpect(jsonPath("$.data.list[0].srvyTmpltExpln").value("만족도 설문 템플릿"));
    }

    @Test
    public void getTemplate_ShouldReturnTemplateDetail() throws Exception {
        SurveyTemplateDto dto = SurveyTemplateDto.builder()
                .srvyTmpltSn(101L)
                .srvyTmpltExpln("만족도 설문 템플릿")
                .build();

        when(surveyService.getTmplat(101L)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/surveys/templates/101")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.srvyTmpltSn").value(101));
    }

    @Test
    public void insertTemplate_ShouldSucceed() throws Exception {
        SurveyTemplateDto dto = SurveyTemplateDto.builder()
                .srvyTmpltExpln("신규 만족도 템플릿")
                .build();

        doNothing().when(surveyService).insertTmplat(any(SurveyTemplateDto.class));

        mockMvc.perform(post("/api/v1/admin/system/surveys/templates")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).insertTmplat(any(SurveyTemplateDto.class));
    }

    @Test
    public void updateTemplate_ShouldSucceed() throws Exception {
        SurveyTemplateDto dto = SurveyTemplateDto.builder()
                .srvyTmpltExpln("수정 만족도 템플릿")
                .build();

        doNothing().when(surveyService).updateTmplat(any(SurveyTemplateDto.class));

        mockMvc.perform(put("/api/v1/admin/system/surveys/templates/101")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).updateTmplat(argThat(t -> Long.valueOf(101L).equals(t.getSrvyTmpltSn())));
    }

    @Test
    public void deleteTemplate_ShouldSucceed() throws Exception {
        doNothing().when(surveyService).deleteTmplat(101L);

        mockMvc.perform(delete("/api/v1/admin/system/surveys/templates/101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).deleteTmplat(101L);
    }

    // --- Survey Info ---

    @Test
    public void getSurveys_ShouldReturnPagedSurveys() throws Exception {
        SurveyInfoDto dto = SurveyInfoDto.builder()
                .srvySn(201L)
                .srvyTtl("2026년 상반기 임직원 만족도 조사")
                .build();
        Page<SurveyInfoDto> page = new PageImpl<>(Collections.singletonList(dto), PageRequest.of(0, 10), 1);

        when(surveyService.getSurveyList(eq("상반기"), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/surveys")
                .param("keyword", "상반기")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].srvySn").value(201))
                .andExpect(jsonPath("$.data.list[0].srvyTtl").value("2026년 상반기 임직원 만족도 조사"));
    }

    @Test
    public void getSurvey_ShouldReturnSurveyDetail() throws Exception {
        SurveyInfoDto dto = SurveyInfoDto.builder()
                .srvySn(201L)
                .srvyTtl("2026년 상반기 임직원 만족도 조사")
                .build();

        when(surveyService.getSurvey(201L)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/surveys/201")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.srvySn").value(201));
    }

    @Test
    public void insertSurvey_ShouldSucceed() throws Exception {
        SurveyInfoDto dto = SurveyInfoDto.builder()
                .srvyTmpltSn(101L)
                .srvyTtl("신규 설문조사")
                .build();

        doNothing().when(surveyService).insertSurvey(any(SurveyInfoDto.class));

        mockMvc.perform(post("/api/v1/admin/system/surveys")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).insertSurvey(any(SurveyInfoDto.class));
    }

    @Test
    public void updateSurvey_ShouldSucceed() throws Exception {
        SurveyInfoDto dto = SurveyInfoDto.builder()
                .srvySn(201L)
                .srvyTmpltSn(101L)
                .srvyTtl("수정 설문조사")
                .build();

        doNothing().when(surveyService).updateSurvey(any(SurveyInfoDto.class));

        mockMvc.perform(put("/api/v1/admin/system/surveys/201")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).updateSurvey(argThat(s -> Long.valueOf(201L).equals(s.getSrvySn())));
    }

    @Test
    public void deleteSurvey_ShouldSucceed() throws Exception {
        doNothing().when(surveyService).deleteSurvey(201L);

        mockMvc.perform(delete("/api/v1/admin/system/surveys/201"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).deleteSurvey(201L);
    }

    // --- Questions ---

    @Test
    public void getQuestions_ShouldReturnList() throws Exception {
        SurveyQuestionDto dto = SurveyQuestionDto.builder()
                .srvyQstnSn(301L)
                .qstnCn("현재 직무에 만족하십니까?")
                .build();

        when(surveyService.getQuestionList(201L)).thenReturn(Collections.singletonList(dto));

        mockMvc.perform(get("/api/v1/admin/system/surveys/201/questions")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].srvyQstnSn").value(301));
    }

    @Test
    public void insertQuestion_ShouldSucceed() throws Exception {
        SurveyQuestionDto dto = SurveyQuestionDto.builder()
                .srvySn(201L)
                .qstnCn("직무 만족도 질문")
                .build();

        doNothing().when(surveyService).insertQuestion(any(SurveyQuestionDto.class));

        mockMvc.perform(post("/api/v1/admin/system/surveys/201/questions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).insertQuestion(argThat(q -> Long.valueOf(201L).equals(q.getSrvySn())));
    }

    @Test
    public void updateQuestion_ShouldSucceed() throws Exception {
        SurveyQuestionDto dto = SurveyQuestionDto.builder()
                .srvyQstnSn(301L)
                .srvySn(201L)
                .qstnCn("직무 만족도 질문 수정")
                .build();

        doNothing().when(surveyService).updateQuestion(any(SurveyQuestionDto.class));

        mockMvc.perform(put("/api/v1/admin/system/surveys/201/questions/301")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).updateQuestion(argThat(q -> Long.valueOf(201L).equals(q.getSrvySn())
                && Long.valueOf(301L).equals(q.getSrvyQstnSn())));
    }

    @Test
    public void deleteQuestion_ShouldSucceed() throws Exception {
        doNothing().when(surveyService).deleteQuestion(301L);

        mockMvc.perform(delete("/api/v1/admin/system/surveys/201/questions/301"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).deleteQuestion(301L);
    }

    // --- Items ---

    @Test
    public void insertItem_ShouldSucceed() throws Exception {
        SurveyArticleDto dto = SurveyArticleDto.builder()
                .srvyQstnSn(301L)
                .srvySn(201L)
                .artclCn("매우 만족")
                .build();

        doNothing().when(surveyService).insertItem(any(SurveyArticleDto.class));

        mockMvc.perform(post("/api/v1/admin/system/surveys/questions/301/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).insertItem(argThat(i -> Long.valueOf(301L).equals(i.getSrvyQstnSn())));
    }

    @Test
    public void updateItem_ShouldSucceed() throws Exception {
        SurveyArticleDto dto = SurveyArticleDto.builder()
                .srvyArtclSn(401L)
                .srvyQstnSn(301L)
                .srvySn(201L)
                .artclCn("매우 만족 수정")
                .build();

        doNothing().when(surveyService).updateItem(any(SurveyArticleDto.class));

        mockMvc.perform(put("/api/v1/admin/system/surveys/questions/items/401")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).updateItem(argThat(i -> Long.valueOf(401L).equals(i.getSrvyArtclSn())));
    }

    @Test
    public void deleteItem_ShouldSucceed() throws Exception {
        doNothing().when(surveyService).deleteItem(401L);

        mockMvc.perform(delete("/api/v1/admin/system/surveys/questions/items/401"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).deleteItem(401L);
    }
}
