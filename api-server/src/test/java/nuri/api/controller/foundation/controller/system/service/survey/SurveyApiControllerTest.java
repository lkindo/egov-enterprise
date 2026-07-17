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
                .srvyTmpltId("TMPLAT_001")
                .srvyTmpltExpln("만족도 설문 템플릿")
                .build();
        Page<SurveyTemplateDto> page = new PageImpl<>(Collections.singletonList(dto), PageRequest.of(0, 10), 1);

        when(surveyService.getTmplatList(eq("만족도"), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/surveys/templates")
                .param("keyword", "만족도")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].srvyTmpltId").value("TMPLAT_001"))
                .andExpect(jsonPath("$.data.list[0].srvyTmpltExpln").value("만족도 설문 템플릿"));
    }

    @Test
    public void getTemplate_ShouldReturnTemplateDetail() throws Exception {
        SurveyTemplateDto dto = SurveyTemplateDto.builder()
                .srvyTmpltId("TMPLAT_001")
                .srvyTmpltExpln("만족도 설문 템플릿")
                .build();

        when(surveyService.getTmplat("TMPLAT_001")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/surveys/templates/TMPLAT_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.srvyTmpltId").value("TMPLAT_001"));
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

        mockMvc.perform(put("/api/v1/admin/system/surveys/templates/TMPLAT_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).updateTmplat(argThat(t -> "TMPLAT_001".equals(t.getSrvyTmpltId())));
    }

    @Test
    public void deleteTemplate_ShouldSucceed() throws Exception {
        doNothing().when(surveyService).deleteTmplat("TMPLAT_001");

        mockMvc.perform(delete("/api/v1/admin/system/surveys/templates/TMPLAT_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).deleteTmplat("TMPLAT_001");
    }

    // --- Survey Info ---

    @Test
    public void getSurveys_ShouldReturnPagedSurveys() throws Exception {
        SurveyInfoDto dto = SurveyInfoDto.builder()
                .srvyId("SRVY_001")
                .srvyTtl("2026년 상반기 임직원 만족도 조사")
                .build();
        Page<SurveyInfoDto> page = new PageImpl<>(Collections.singletonList(dto), PageRequest.of(0, 10), 1);

        when(surveyService.getSurveyList(eq("상반기"), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/surveys")
                .param("keyword", "상반기")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].srvyId").value("SRVY_001"))
                .andExpect(jsonPath("$.data.list[0].srvyTtl").value("2026년 상반기 임직원 만족도 조사"));
    }

    @Test
    public void getSurvey_ShouldReturnSurveyDetail() throws Exception {
        SurveyInfoDto dto = SurveyInfoDto.builder()
                .srvyId("SRVY_001")
                .srvyTtl("2026년 상반기 임직원 만족도 조사")
                .build();

        when(surveyService.getSurvey("SRVY_001")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/surveys/SRVY_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.srvyId").value("SRVY_001"));
    }

    @Test
    public void insertSurvey_ShouldSucceed() throws Exception {
        SurveyInfoDto dto = SurveyInfoDto.builder()
                .srvyId("SRVY_NEW")
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
                .srvyId("SRVY_001")
                .srvyTtl("수정 설문조사")
                .build();

        doNothing().when(surveyService).updateSurvey(any(SurveyInfoDto.class));

        mockMvc.perform(put("/api/v1/admin/system/surveys/SRVY_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).updateSurvey(argThat(s -> "SRVY_001".equals(s.getSrvyId())));
    }

    @Test
    public void deleteSurvey_ShouldSucceed() throws Exception {
        doNothing().when(surveyService).deleteSurvey("SRVY_001");

        mockMvc.perform(delete("/api/v1/admin/system/surveys/SRVY_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).deleteSurvey("SRVY_001");
    }

    // --- Questions ---

    @Test
    public void getQuestions_ShouldReturnList() throws Exception {
        SurveyQuestionDto dto = SurveyQuestionDto.builder()
                .srvyQstnId("Q_001")
                .qstnCn("현재 직무에 만족하십니까?")
                .build();

        when(surveyService.getQuestionList("SRVY_001")).thenReturn(Collections.singletonList(dto));

        mockMvc.perform(get("/api/v1/admin/system/surveys/SRVY_001/questions")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].srvyQstnId").value("Q_001"));
    }

    @Test
    public void insertQuestion_ShouldSucceed() throws Exception {
        SurveyQuestionDto dto = SurveyQuestionDto.builder()
                .srvyQstnId("Q_NEW")
                .srvyId("SRVY_001")
                .qstnCn("직무 만족도 질문")
                .build();

        doNothing().when(surveyService).insertQuestion(any(SurveyQuestionDto.class));

        mockMvc.perform(post("/api/v1/admin/system/surveys/SRVY_001/questions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).insertQuestion(argThat(q -> "SRVY_001".equals(q.getSrvyId())));
    }

    @Test
    public void updateQuestion_ShouldSucceed() throws Exception {
        SurveyQuestionDto dto = SurveyQuestionDto.builder()
                .srvyQstnId("Q_001")
                .srvyId("SRVY_001")
                .qstnCn("직무 만족도 질문 수정")
                .build();

        doNothing().when(surveyService).updateQuestion(any(SurveyQuestionDto.class));

        mockMvc.perform(put("/api/v1/admin/system/surveys/SRVY_001/questions/Q_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).updateQuestion(argThat(q -> "SRVY_001".equals(q.getSrvyId()) && "Q_001".equals(q.getSrvyQstnId())));
    }

    @Test
    public void deleteQuestion_ShouldSucceed() throws Exception {
        doNothing().when(surveyService).deleteQuestion("Q_001");

        mockMvc.perform(delete("/api/v1/admin/system/surveys/SRVY_001/questions/Q_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).deleteQuestion("Q_001");
    }

    // --- Items ---

    @Test
    public void insertItem_ShouldSucceed() throws Exception {
        SurveyArticleDto dto = SurveyArticleDto.builder()
                .srvyArtclId("ITEM_NEW")
                .srvyQstnId("Q_001")
                .srvyId("SRVY_001")
                .artclCn("매우 만족")
                .build();

        doNothing().when(surveyService).insertItem(any(SurveyArticleDto.class));

        mockMvc.perform(post("/api/v1/admin/system/surveys/questions/Q_001/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).insertItem(argThat(i -> "Q_001".equals(i.getSrvyQstnId())));
    }

    @Test
    public void updateItem_ShouldSucceed() throws Exception {
        SurveyArticleDto dto = SurveyArticleDto.builder()
                .srvyArtclId("ITEM_001")
                .srvyQstnId("Q_001")
                .srvyId("SRVY_001")
                .artclCn("매우 만족 수정")
                .build();

        doNothing().when(surveyService).updateItem(any(SurveyArticleDto.class));

        mockMvc.perform(put("/api/v1/admin/system/surveys/questions/items/ITEM_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).updateItem(argThat(i -> "ITEM_001".equals(i.getSrvyArtclId())));
    }

    @Test
    public void deleteItem_ShouldSucceed() throws Exception {
        doNothing().when(surveyService).deleteItem("ITEM_001");

        mockMvc.perform(delete("/api/v1/admin/system/surveys/questions/items/ITEM_001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).deleteItem("ITEM_001");
    }
}
