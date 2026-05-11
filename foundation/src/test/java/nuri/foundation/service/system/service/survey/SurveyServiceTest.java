package nuri.foundation.service.system.service.survey;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.system.service.survey.*;
import nuri.foundation.service.system.service.survey.dto.QustnrInfoDto;
import nuri.foundation.service.system.service.survey.dto.QustnrTmplatDto;
import nuri.foundation.service.system.service.survey.dto.QustnrIemDto;
import nuri.foundation.service.system.service.survey.dto.QustnrQesitmDto;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("SurveyService 단위 테스트")
class SurveyServiceTest {

    @InjectMocks
    private SurveyService surveyService;

    @Mock
    private QustnrTmplatRepository tmplatRepository;
    @Mock
    private QustnrInfoRepository infoRepository;
    @Mock
    private QustnrQesitmRepository qesitmRepository;
    @Mock
    private QustnrIemRepository iemRepository;

    @Test
    @DisplayName("설문 템플릿 목록 조회 - 키워드 없음")
    void getTmplatList_NoKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        QustnrTmplat tmplat = QustnrTmplat.builder().qustnrTmplatId("T1").qustnrTmplatTy("Type1").build();
        given(tmplatRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(tmplat)));

        Page<QustnrTmplatDto> result = surveyService.getTmplatList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getQustnrTmplatId()).isEqualTo("T1");
    }

    @Test
    @DisplayName("설문 템플릿 목록 조회 - 키워드 있음")
    void getTmplatList_WithKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        QustnrTmplat tmplat = QustnrTmplat.builder().qustnrTmplatId("T1").qustnrTmplatTy("Type1").build();
        given(tmplatRepository.findByQustnrTmplatTyContaining(eq("Keyword"), any())).willReturn(new PageImpl<>(List.of(tmplat)));

        Page<QustnrTmplatDto> result = surveyService.getTmplatList("Keyword", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(tmplatRepository).findByQustnrTmplatTyContaining(eq("Keyword"), any());
    }

    @Test
    @DisplayName("설문 템플릿 상세 조회 - 성공")
    void getTmplat_Success() {
        QustnrTmplat tmplat = QustnrTmplat.builder().qustnrTmplatId("T1").build();
        given(tmplatRepository.findById("T1")).willReturn(Optional.of(tmplat));

        QustnrTmplatDto result = surveyService.getTmplat("T1");

        assertThat(result.getQustnrTmplatId()).isEqualTo("T1");
    }

    @Test
    @DisplayName("설문 정보 목록 조회 - 키워드 없음")
    void getSurveyList_NoKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        QustnrInfo info = QustnrInfo.builder().qustnrId("S1").qustnrSj("Subject").build();
        given(infoRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(info)));

        Page<QustnrInfoDto> result = surveyService.getSurveyList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("설문 정보 상세 조회")
    void getSurvey() {
        QustnrInfo info = QustnrInfo.builder().qustnrId("S1").build();
        given(infoRepository.findById("S1")).willReturn(Optional.of(info));

        QustnrInfoDto result = surveyService.getSurvey("S1");

        assertThat(result.getQustnrId()).isEqualTo("S1");
    }

    @Test
    @DisplayName("설문 정보 등록 - 성공")
    void insertSurvey_Success() {
        QustnrInfoDto dto = QustnrInfoDto.builder()
                .qustnrSj("Subject")
                .qustnrBeginDe("2024-01-01")
                .qustnrEndDe("2024-01-31")
                .build();
        surveyService.insertSurvey(dto);
        verify(infoRepository, times(1)).save(any(QustnrInfo.class));
    }

    @Test
    @DisplayName("설문 문항 목록 조회")
    void getQuestionList() {
        QustnrQesitm question = QustnrQesitm.builder().qustnrQesitmId("Q1").qustnrId("S1").qestnSn(1L).build();
        given(qesitmRepository.findByQustnrIdOrderByQestnSnAsc("S1")).willReturn(List.of(question));
        
        QustnrIem item = QustnrIem.builder().qustnrIemId("I1").qustnrQesitmId("Q1").iemSn(1L).build();
        given(iemRepository.findByQustnrQesitmIdOrderByIemSnAsc("Q1")).willReturn(List.of(item));

        List<QustnrQesitmDto> result = surveyService.getQuestionList("S1");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getQustnrQesitmId()).isEqualTo("Q1");
    }
}
