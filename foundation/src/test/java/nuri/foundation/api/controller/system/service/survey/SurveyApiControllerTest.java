package nuri.foundation.api.controller.system.service.survey;

import nuri.foundation.test.BaseControllerTest;
import nuri.foundation.service.system.service.survey.EgovSurveyService;
import nuri.foundation.service.system.service.survey.dto.QustnrInfoDto;
import nuri.foundation.service.system.service.survey.dto.QustnrTmplatDto;
import nuri.foundation.service.system.service.survey.dto.QustnrIemDto;
import nuri.foundation.service.system.service.survey.dto.QustnrQesitmDto;
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

    private EgovSurveyService surveyService;
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    @Override
    protected Object getController() {
        surveyService = mock(EgovSurveyService.class);
        return new SurveyApiController(surveyService);
    }

    // --- Templates ---

    @Test
    public void getTemplates_ShouldReturnPagedTemplates() throws Exception {
        QustnrTmplatDto dto = QustnrTmplatDto.builder()
                .srvyTmplatId("TMPLAT_001")
                .srvyTmplatCn("만족도 설문 템플릿")
                .build();
        Page<QustnrTmplatDto> page = new PageImpl<>(Collections.singletonList(dto), PageRequest.of(0, 10), 1);

        when(surveyService.getTmplatList(eq("만족도"), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/surveys/templates")
                .param("keyword", "만족도")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].srvyTmplatId").value("TMPLAT_001"))
                .andExpect(jsonPath("$.data.list[0].srvyTmplatCn").value("만족도 설문 템플릿"));
    }

    @Test
    public void getTemplate_ShouldReturnTemplateDetail() throws Exception {
        QustnrTmplatDto dto = QustnrTmplatDto.builder()
                .srvyTmplatId("TMPLAT_001")
                .srvyTmplatCn("만족도 설문 템플릿")
                .build();

        when(surveyService.getTmplat("TMPLAT_001")).thenReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/surveys/templates/TMPLAT_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.srvyTmplatId").value("TMPLAT_001"));
    }

    @Test
    public void insertTemplate_ShouldSucceed() throws Exception {
        QustnrTmplatDto dto = QustnrTmplatDto.builder()
                .srvyTmplatCn("신규 만족도 템플릿")
                .build();

        doNothing().when(surveyService).insertTmplat(any(QustnrTmplatDto.class));

        mockMvc.perform(post("/api/v1/admin/system/surveys/templates")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).insertTmplat(any(QustnrTmplatDto.class));
    }

    @Test
    public void updateTemplate_ShouldSucceed() throws Exception {
        QustnrTmplatDto dto = QustnrTmplatDto.builder()
                .srvyTmplatCn("수정 만족도 템플릿")
                .build();

        doNothing().when(surveyService).updateTmplat(any(QustnrTmplatDto.class));

        mockMvc.perform(put("/api/v1/admin/system/surveys/templates/TMPLAT_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).updateTmplat(argThat(t -> "TMPLAT_001".equals(t.getSrvyTmplatId())));
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
        QustnrInfoDto dto = QustnrInfoDto.builder()
                .srvyId("SRVY_001")
                .srvyTtl("2026년 상반기 임직원 만족도 조사")
                .build();
        Page<QustnrInfoDto> page = new PageImpl<>(Collections.singletonList(dto), PageRequest.of(0, 10), 1);

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
        QustnrInfoDto dto = QustnrInfoDto.builder()
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
        QustnrInfoDto dto = QustnrInfoDto.builder()
                .srvyTtl("신규 설문조사")
                .build();

        doNothing().when(surveyService).insertSurvey(any(QustnrInfoDto.class));

        mockMvc.perform(post("/api/v1/admin/system/surveys")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).insertSurvey(any(QustnrInfoDto.class));
    }

    @Test
    public void updateSurvey_ShouldSucceed() throws Exception {
        QustnrInfoDto dto = QustnrInfoDto.builder()
                .srvyTtl("수정 설문조사")
                .build();

        doNothing().when(surveyService).updateSurvey(any(QustnrInfoDto.class));

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
        QustnrQesitmDto dto = QustnrQesitmDto.builder()
                .srvyQitemId("Q_001")
                .srvyQitemCn("현재 직무에 만족하십니까?")
                .build();

        when(surveyService.getQuestionList("SRVY_001")).thenReturn(Collections.singletonList(dto));

        mockMvc.perform(get("/api/v1/admin/system/surveys/SRVY_001/questions")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].srvyQitemId").value("Q_001"));
    }

    @Test
    public void insertQuestion_ShouldSucceed() throws Exception {
        QustnrQesitmDto dto = QustnrQesitmDto.builder()
                .srvyQitemCn("직무 만족도 질문")
                .build();

        doNothing().when(surveyService).insertQuestion(any(QustnrQesitmDto.class));

        mockMvc.perform(post("/api/v1/admin/system/surveys/SRVY_001/questions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).insertQuestion(argThat(q -> "SRVY_001".equals(q.getSrvyId())));
    }

    @Test
    public void updateQuestion_ShouldSucceed() throws Exception {
        QustnrQesitmDto dto = QustnrQesitmDto.builder()
                .srvyQitemCn("직무 만족도 질문 수정")
                .build();

        doNothing().when(surveyService).updateQuestion(any(QustnrQesitmDto.class));

        mockMvc.perform(put("/api/v1/admin/system/surveys/SRVY_001/questions/Q_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).updateQuestion(argThat(q -> "SRVY_001".equals(q.getSrvyId()) && "Q_001".equals(q.getSrvyQitemId())));
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
        QustnrIemDto dto = QustnrIemDto.builder()
                .srvyItemCn("매우 만족")
                .build();

        doNothing().when(surveyService).insertItem(any(QustnrIemDto.class));

        mockMvc.perform(post("/api/v1/admin/system/surveys/questions/Q_001/items")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).insertItem(argThat(i -> "Q_001".equals(i.getSrvyQitemId())));
    }

    @Test
    public void updateItem_ShouldSucceed() throws Exception {
        QustnrIemDto dto = QustnrIemDto.builder()
                .srvyItemCn("매우 만족 수정")
                .build();

        doNothing().when(surveyService).updateItem(any(QustnrIemDto.class));

        mockMvc.perform(put("/api/v1/admin/system/surveys/questions/items/ITEM_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(surveyService, times(1)).updateItem(argThat(i -> "ITEM_001".equals(i.getSrvyItemId())));
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
