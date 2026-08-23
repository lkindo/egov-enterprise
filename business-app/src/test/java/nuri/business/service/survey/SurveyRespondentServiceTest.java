package nuri.business.service.survey;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.survey.SurveyInfo;
import nuri.business.domain.survey.SurveyInfoRepository;
import nuri.business.domain.survey.SurveyRespondent;
import nuri.business.domain.survey.SurveyRespondentRepository;
import nuri.business.service.survey.dto.SurveyRespondentDto;
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
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("SurveyRespondentService 단위 테스트")
class SurveyRespondentServiceTest {

    @org.mockito.Spy
    nuri.business.service.survey.dto.SurveyRespondentMapper surveyRespondentMapper = new nuri.business.service.survey.dto.SurveyRespondentMapperImpl();

    @InjectMocks
    private SurveyRespondentService surveyRespondentService;

    @Mock
    private SurveyRespondentRepository surveyRespondentRepository;
    @Mock
    private SurveyInfoRepository surveyInfoRepository;

    @Test
    @DisplayName("설문 응답자 목록 조회 - 키워드 없음(null)이어도 srvySn 범위는 유지된다")
    void getSurveyRespondentList_NullKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        SurveyRespondent entity = SurveyRespondent.builder().srvyRspdntId("R1").rspdntNm("User1").build();
        given(surveyRespondentRepository.searchBySrvySnAndKeyword(eq(201L), eq(""), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(entity)));

        Page<SurveyRespondentDto> result = surveyRespondentService.getSurveyRespondentList(201L, null, pageable);

        assertThat(result.getContent()).hasSize(1);
        // 키워드가 없다고 해서 설문 범위까지 풀리면 안 된다 — 그것이 종전의 동작이었다.
        verify(surveyRespondentRepository).searchBySrvySnAndKeyword(eq(201L), eq(""), eq(pageable));
        verify(surveyRespondentRepository, never()).findByRspdntNmContaining(any(), any());
    }

    /**
     * 🔒 <b>이 두 테스트는 종전에 버그를 고정하고 있었다.</b>
     *
     * <p>{@code srvySn=201} 을 넘기고서 {@code findByRspdntNmContaining}(설문 무관 전체 검색)이
     * 호출되는 것을 {@code verify} 했다 — 즉 <b>"srvySn 은 무시된다" 를 정답으로 못 박은</b> 셈이다.
     * 응답자 레코드는 성별·생년월일·전화번호를 담으므로 설문 간 혼입은 개인정보 노출이다.
     * 서비스를 {@code searchBySrvySnAndKeyword} 로 고치면서 이 단언도 함께 뒤집는다.
     * (신호를 지운 것이 아니라, 틀린 기대값을 정정한 것이다 — 커버리지는 오히려 늘었다.)
     */
    @Test
    @DisplayName("설문 응답자 목록 조회 - 키워드 있음 (srvySn 으로 범위 한정)")
    void getSurveyRespondentList_WithKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        SurveyRespondent entity = SurveyRespondent.builder().srvyRspdntId("R1").rspdntNm("User1").build();
        given(surveyRespondentRepository.searchBySrvySnAndKeyword(eq(201L), eq("User"), eq(pageable)))
                .willReturn(new PageImpl<>(List.of(entity)));

        Page<SurveyRespondentDto> result = surveyRespondentService.getSurveyRespondentList(201L, "User", pageable);

        assertThat(result.getContent()).hasSize(1);
        verify(surveyRespondentRepository).searchBySrvySnAndKeyword(eq(201L), eq("User"), eq(pageable));
        // 설문 무관 전체 검색으로 되돌아가면 즉시 red 가 된다.
        verify(surveyRespondentRepository, never()).findByRspdntNmContaining(any(), any());
    }

    @Test
    @DisplayName("설문 응답자 상세 조회 - 성공")
    void getSurveyRespondent_Success() {
        SurveyRespondent entity = SurveyRespondent.builder().srvyRspdntId("R1").rspdntNm("User1").build();
        given(surveyRespondentRepository.findBySrvySnAndSrvyRspdntId(201L, "R1")).willReturn(Optional.of(entity));

        SurveyRespondentDto result = surveyRespondentService.getSurveyRespondent(201L, "R1");

        assertThat(result.getRspdntNm()).isEqualTo("User1");
    }

    @Test
    @DisplayName("설문 응답자 상세 조회 - 실패")
    void getSurveyRespondent_Fail() {
        given(surveyRespondentRepository.findBySrvySnAndSrvyRspdntId(201L, "R99")).willReturn(Optional.empty());
        assertThrows(BusinessException.class, () -> surveyRespondentService.getSurveyRespondent(201L, "R99"));
    }

    @Test
    @DisplayName("설문 응답자 등록")
    void createSurveyRespondent() {
        SurveyRespondentDto dto = SurveyRespondentDto.builder().srvySn(201L).rspdntNm("New User").build();
        given(surveyInfoRepository.findById(201L)).willReturn(Optional.of(
                SurveyInfo.builder().srvySn(201L).srvyTmpltSn(101L).build()));
        String id = surveyRespondentService.createSurveyRespondent("user1", dto);
        
        assertThat(id).isNotNull();
        assertThat(id).startsWith("SRES_");
        verify(surveyRespondentRepository, times(1)).save(any(SurveyRespondent.class));
    }

    @Test
    @DisplayName("설문 응답자 수정 - 성공")
    void updateSurveyRespondent_Success() {
        SurveyRespondent entity = SurveyRespondent.builder().srvyRspdntId("R1").rspdntNm("Old").build();
        given(surveyRespondentRepository.findBySrvySnAndSrvyRspdntId(201L, "R1")).willReturn(Optional.of(entity));

        SurveyRespondentDto dto = SurveyRespondentDto.builder().rspdntNm("New").build();
        surveyRespondentService.updateSurveyRespondent(201L, "R1", "user1", dto);

        assertThat(entity.getRspdntNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("설문 응답자 수정 - 실패 (데이터 없음)")
    void updateSurveyRespondent_Fail() {
        given(surveyRespondentRepository.findBySrvySnAndSrvyRspdntId(201L, "R99")).willReturn(Optional.empty());
        SurveyRespondentDto dto = SurveyRespondentDto.builder().rspdntNm("New").build();
        assertThrows(BusinessException.class,
                () -> surveyRespondentService.updateSurveyRespondent(201L, "R99", "user1", dto));
    }

    @Test
    @DisplayName("설문 응답자 삭제")
    void deleteSurveyRespondent() {
        SurveyRespondent entity = SurveyRespondent.builder().srvyRspdntId("R1").srvySn(201L).build();
        given(surveyRespondentRepository.findBySrvySnAndSrvyRspdntId(201L, "R1")).willReturn(Optional.of(entity));

        surveyRespondentService.deleteSurveyRespondent(201L, "R1");

        verify(surveyRespondentRepository, times(1)).delete(entity);
    }
}
