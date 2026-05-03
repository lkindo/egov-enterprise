package nuri.foundation.service.system.service.survey;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.system.service.survey.SurveyRespondent;
import nuri.foundation.domain.system.service.survey.SurveyRespondentRepository;
import nuri.foundation.service.system.service.survey.dto.SurveyRespondentDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("SurveyRespondentService 단위 테스트")
class SurveyRespondentServiceTest {

    @InjectMocks
    private SurveyRespondentService surveyRespondentService;

    @Mock
    private SurveyRespondentRepository surveyRespondentRepository;

    @Test
    @DisplayName("설문 응답자 목록 조회 - 키워드 없음 (null)")
    void getSurveyRespondentList_NullKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        SurveyRespondent entity = SurveyRespondent.builder().qestnrRespondId("R1").respondNm("User1").build();
        given(surveyRespondentRepository.findByRespondNmContaining(eq(""), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        Page<SurveyRespondentDto> result = surveyRespondentService.getSurveyRespondentList("S1", null, pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(surveyRespondentRepository).findByRespondNmContaining(eq(""), eq(pageable));
    }

    @Test
    @DisplayName("설문 응답자 목록 조회 - 키워드 있음")
    void getSurveyRespondentList_WithKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        SurveyRespondent entity = SurveyRespondent.builder().qestnrRespondId("R1").respondNm("User1").build();
        given(surveyRespondentRepository.findByRespondNmContaining(eq("User"), eq(pageable))).willReturn(new PageImpl<>(List.of(entity)));

        Page<SurveyRespondentDto> result = surveyRespondentService.getSurveyRespondentList("S1", "User", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(surveyRespondentRepository).findByRespondNmContaining(eq("User"), eq(pageable));
    }

    @Test
    @DisplayName("설문 응답자 상세 조회 - 성공")
    void getSurveyRespondent_Success() {
        SurveyRespondent entity = SurveyRespondent.builder().qestnrRespondId("R1").respondNm("User1").build();
        given(surveyRespondentRepository.findById("R1")).willReturn(Optional.of(entity));

        SurveyRespondentDto result = surveyRespondentService.getSurveyRespondent("R1");

        assertThat(result.getRespondNm()).isEqualTo("User1");
    }

    @Test
    @DisplayName("설문 응답자 상세 조회 - 실패")
    void getSurveyRespondent_Fail() {
        given(surveyRespondentRepository.findById("R99")).willReturn(Optional.empty());
        assertThrows(BusinessException.class, () -> surveyRespondentService.getSurveyRespondent("R99"));
    }

    @Test
    @DisplayName("설문 응답자 등록")
    void createSurveyRespondent() {
        SurveyRespondentDto dto = SurveyRespondentDto.builder().respondNm("New User").build();
        String id = surveyRespondentService.createSurveyRespondent("user1", dto);
        
        assertThat(id).isNotNull();
        assertThat(id).startsWith("SRES_");
        verify(surveyRespondentRepository, times(1)).save(any(SurveyRespondent.class));
    }

    @Test
    @DisplayName("설문 응답자 수정 - 성공")
    void updateSurveyRespondent_Success() {
        SurveyRespondent entity = SurveyRespondent.builder().qestnrRespondId("R1").respondNm("Old").build();
        given(surveyRespondentRepository.findById("R1")).willReturn(Optional.of(entity));

        SurveyRespondentDto dto = SurveyRespondentDto.builder().respondNm("New").build();
        surveyRespondentService.updateSurveyRespondent("R1", "user1", dto);

        assertThat(entity.getRespondNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("설문 응답자 수정 - 실패 (데이터 없음)")
    void updateSurveyRespondent_Fail() {
        given(surveyRespondentRepository.findById("R99")).willReturn(Optional.empty());
        SurveyRespondentDto dto = SurveyRespondentDto.builder().respondNm("New").build();
        assertThrows(BusinessException.class, () -> surveyRespondentService.updateSurveyRespondent("R99", "user1", dto));
    }

    @Test
    @DisplayName("설문 응답자 삭제")
    void deleteSurveyRespondent() {
        surveyRespondentService.deleteSurveyRespondent("R1");
        verify(surveyRespondentRepository, times(1)).deleteById("R1");
    }
}
