package com.company.project.service.system.service.survey;

import com.company.project.domain.system.service.survey.SurveyRespondent;
import com.company.project.domain.system.service.survey.SurveyRespondentRepository;
import com.company.project.service.system.service.survey.dto.SurveyRespondentDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("SurveyRespondentService 테스트")
class SurveyRespondentServiceTest {

    @Mock
    private SurveyRespondentRepository surveyRespondentRepository;

    @InjectMocks
    private SurveyRespondentService surveyRespondentService;

    @Test
    @DisplayName("설문 응답자 목록 조회")
    void getSurveyRespondentList_Success() {
        // Given
        PageRequest pageable = PageRequest.of(0, 10);
        SurveyRespondent entity = SurveyRespondent.builder().qestnrRespondId("R1").respondNm("Name").build();
        given(surveyRespondentRepository.findByRespondNmContaining(anyString(), any())).willReturn(new PageImpl<>(List.of(entity)));

        // When
        Page<SurveyRespondentDto> result = surveyRespondentService.getSurveyRespondentList("Q1", "keyword", pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 응답자 상세 조회")
    void getSurveyRespondent_Success() {
        // Given
        SurveyRespondent entity = SurveyRespondent.builder().qestnrRespondId("R1").build();
        given(surveyRespondentRepository.findById("R1")).willReturn(Optional.of(entity));

        // When
        SurveyRespondentDto result = surveyRespondentService.getSurveyRespondent("R1");

        // Then
        assertThat(result.getQestnrRespondId()).isEqualTo("R1");
    }

    @Test
    @DisplayName("설문 응답자 등록")
    void createSurveyRespondent_Success() {
        // Given
        SurveyRespondentDto dto = SurveyRespondentDto.builder().respondNm("New").build();

        // When
        String id = surveyRespondentService.createSurveyRespondent("user1", dto);

        // Then
        assertThat(id).startsWith("SRES_");
        verify(surveyRespondentRepository).save(any(SurveyRespondent.class));
    }

    @Test
    @DisplayName("설문 응답자 수정")
    void updateSurveyRespondent_Success() {
        // Given
        SurveyRespondent entity = SurveyRespondent.builder().qestnrRespondId("R1").build();
        given(surveyRespondentRepository.findById("R1")).willReturn(Optional.of(entity));
        SurveyRespondentDto dto = SurveyRespondentDto.builder().respondNm("Updated").build();

        // When
        surveyRespondentService.updateSurveyRespondent("R1", "user1", dto);

        // Then
        assertThat(entity.getRespondNm()).isEqualTo("Updated");
    }

    @Test
    @DisplayName("설문 응답자 삭제")
    void deleteSurveyRespondent_Success() {
        // When
        surveyRespondentService.deleteSurveyRespondent("R1");

        // Then
        verify(surveyRespondentRepository).deleteById("R1");
    }
}
