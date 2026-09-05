package nuri.business.service.survey;

import nuri.business.domain.survey.*;
import nuri.business.service.survey.dto.SurveyResponseSubmitDto;
import nuri.business.service.survey.dto.SurveyStatsDto;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("SurveyResultService 단위 테스트")
class SurveyResultServiceTest {

    @Mock private SurveyResultRepository resultRepository;
    @Mock private SurveyQuestionRepository questionRepository;
    @Mock private SurveyArticleRepository articleRepository;
    @Mock private SurveyInfoRepository infoRepository;

    @InjectMocks private SurveyResultService service;

    private static SurveyQuestion question(Long sn, String cn, String type) {
        return SurveyQuestion.builder()
                .srvyQstnSn(sn).srvySn(201L).srvyTmpltSn(101L).qstnSn(1L).qstnCn(cn).qstnTypeCd(type).build();
    }

    private static SurveyArticle article(Long sn, Long qstnSn, String cn) {
        return SurveyArticle.builder()
                .srvyArtclSn(sn).srvyQstnSn(qstnSn).srvySn(201L).srvyTmpltSn(101L).artclSn(1L).artclCn(cn).build();
    }

    /** 기간이 열려 있는 설문 — 경계가 넓어 오늘이 언제든 안에 든다. */
    private static SurveyInfo openSurvey() {
        return SurveyInfo.builder()
                .srvySn(201L).srvyTtl("만족도 조사").srvyTmpltSn(101L)
                .srvyBgngYmd("20000101").srvyEndYmd("29991231").build();
    }

    private static SurveyInfo surveyWithPeriod(String bgng, String end) {
        return SurveyInfo.builder()
                .srvySn(201L).srvyTtl("만족도 조사").srvyTmpltSn(101L)
                .srvyBgngYmd(bgng).srvyEndYmd(end).build();
    }

    private static SurveyResultRepository.ArticleCount count(Long artclSn, long cnt) {
        return new SurveyResultRepository.ArticleCount() {
            @Override public Long getSrvyArtclSn() { return artclSn; }
            @Override public long getCnt() { return cnt; }
        };
    }

    // ---------- 통계 ----------

    /**
     * 비율은 <b>문항 단위 합계</b>로 나눈다. 설문 전체 응답 수로 나누면 문항마다 응답 수가 다를 때
     * 합이 100% 가 되지 않는다 — 이 테스트가 그 실수를 막는다.
     */
    @Test
    @DisplayName("통계 - 비율은 설문 전체가 아니라 문항 단위 합계로 계산된다")
    void statsPercentageIsPerQuestion() {
        given(infoRepository.existsById(201L)).willReturn(true);
        given(questionRepository.findBySrvySnOrderByQstnSnAsc(201L))
                .willReturn(List.of(question(301L, "만족하십니까", "1"), question(302L, "재이용 의향", "1")));
        given(articleRepository.findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(any()))
                .willReturn(List.of(article(401L, 301L, "예"), article(402L, 301L, "아니오"),
                        article(403L, 302L, "예")));
        // Q1 은 3+1=4건, Q2 는 1건. 설문 전체(5)로 나누면 A1 은 60% 가 되고 Q1 합계가 100% 가 안 된다.
        given(resultRepository.countGroupedByArticle(201L))
                .willReturn(List.of(count(401L, 3), count(402L, 1), count(403L, 1)));

        List<SurveyStatsDto> stats = service.getStats(201L);

        assertThat(stats).hasSize(3);
        assertThat(stats.get(0).percentage()).as("A1: 3/4 = 75%").isEqualTo(75.0);
        assertThat(stats.get(1).percentage()).as("A2: 1/4 = 25%").isEqualTo(25.0);
        assertThat(stats.get(2).percentage()).as("A3: 1/1 = 100%").isEqualTo(100.0);
        assertThat(stats.get(0).percentage() + stats.get(1).percentage())
                .as("한 문항의 항목 비율 합은 100% 여야 한다").isEqualTo(100.0);
    }

    /** 아무도 고르지 않은 선택지가 목록에서 사라지면 분포를 읽을 수 없다. */
    @Test
    @DisplayName("통계 - 응답 0건인 항목도 0% 행으로 포함된다")
    void statsIncludeZeroCountArticles() {
        given(infoRepository.existsById(201L)).willReturn(true);
        given(questionRepository.findBySrvySnOrderByQstnSnAsc(201L)).willReturn(List.of(question(301L, "질문", "1")));
        given(articleRepository.findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(any()))
                .willReturn(List.of(article(401L, 301L, "예"), article(402L, 301L, "아니오")));
        given(resultRepository.countGroupedByArticle(201L)).willReturn(List.of(count(401L, 2)));

        List<SurveyStatsDto> stats = service.getStats(201L);

        assertThat(stats).hasSize(2);
        assertThat(stats.get(1).artclCn()).isEqualTo("아니오");
        assertThat(stats.get(1).count()).isZero();
        assertThat(stats.get(1).percentage()).isZero();
    }

    /** 응답이 하나도 없을 때 0 으로 나누면 안 된다. */
    @Test
    @DisplayName("통계 - 응답이 0건이어도 0 나눗셈 없이 0% 를 반환한다")
    void statsHandleZeroTotal() {
        given(infoRepository.existsById(201L)).willReturn(true);
        given(questionRepository.findBySrvySnOrderByQstnSnAsc(201L)).willReturn(List.of(question(301L, "질문", "1")));
        given(articleRepository.findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(any()))
                .willReturn(List.of(article(401L, 301L, "예")));
        given(resultRepository.countGroupedByArticle(201L)).willReturn(List.of());

        List<SurveyStatsDto> stats = service.getStats(201L);

        assertThat(stats).hasSize(1);
        assertThat(stats.get(0).percentage()).isZero();
    }

    @Test
    @DisplayName("통계 - 존재하지 않는 설문이면 404")
    void statsRejectUnknownSurvey() {
        given(infoRepository.existsById(999L)).willReturn(false);
        assertThatThrownBy(() -> service.getStats(999L)).isInstanceOf(BusinessException.class);
    }

    // ---------- 제출 ----------

    /**
     * 🔒 다른 설문의 항목 ID 를 실어 보내면 통계가 오염된다. 문항·항목이 정말 이 설문의 것인지
     * 검사하지 않으면 어떤 항목의 득표수든 임의로 올릴 수 있다.
     */
    @Test
    @DisplayName("🔒 제출 - 다른 설문의 문항 ID 는 거부한다 (통계 오염 차단)")
    void submitRejectsForeignQuestion() {
        given(infoRepository.findById(201L)).willReturn(java.util.Optional.of(openSurvey()));
        given(resultRepository.existsBySrvySnAndFrstRgtrId(anyLong(), anyString())).willReturn(false);
        given(questionRepository.findBySrvySnOrderByQstnSnAsc(201L)).willReturn(List.of(question(301L, "질문", "1")));
        given(articleRepository.findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(any()))
                .willReturn(List.of(article(401L, 301L, "예")));

        SurveyResponseSubmitDto dto = new SurveyResponseSubmitDto("홍길동",
                List.of(new SurveyResponseSubmitDto.Answer(999L, 401L, "예", null)));

        try (var mocked = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                    .thenReturn(java.util.Optional.of("user1"));

            assertThatThrownBy(() -> service.submitResponse(201L, dto))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("해당 설문의 문항이 아닙니다");
        }
        verify(resultRepository, never()).saveAll(any());
    }

    /** 항목이 다른 문항 소속이면 거부한다 — 문항만 맞추고 항목을 바꿔치는 우회를 막는다. */
    @Test
    @DisplayName("🔒 제출 - 문항은 맞아도 항목이 다른 문항 소속이면 거부한다")
    void submitRejectsArticleFromAnotherQuestion() {
        given(infoRepository.findById(201L)).willReturn(java.util.Optional.of(openSurvey()));
        given(resultRepository.existsBySrvySnAndFrstRgtrId(anyLong(), anyString())).willReturn(false);
        given(questionRepository.findBySrvySnOrderByQstnSnAsc(201L))
                .willReturn(List.of(question(301L, "질문1", "1"), question(302L, "질문2", "1")));
        given(articleRepository.findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(any()))
                .willReturn(List.of(article(401L, 301L, "예"), article(402L, 302L, "예")));

        SurveyResponseSubmitDto dto = new SurveyResponseSubmitDto("홍길동",
                List.of(new SurveyResponseSubmitDto.Answer(301L, 402L, "예", null)));

        try (var mocked = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                    .thenReturn(java.util.Optional.of("user1"));

            assertThatThrownBy(() -> service.submitResponse(201L, dto))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("해당 문항의 항목이 아닙니다");
        }
        verify(resultRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("🔒 제출 - 같은 사용자의 재제출은 거부한다")
    void submitRejectsDuplicate() {
        given(infoRepository.findById(201L)).willReturn(java.util.Optional.of(openSurvey()));
        given(resultRepository.existsBySrvySnAndFrstRgtrId(201L, "user1")).willReturn(true);

        SurveyResponseSubmitDto dto = new SurveyResponseSubmitDto("홍길동",
                List.of(new SurveyResponseSubmitDto.Answer(301L, 401L, "예", null)));

        try (var mocked = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                    .thenReturn(java.util.Optional.of("user1"));

            assertThatThrownBy(() -> service.submitResponse(201L, dto))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("이미 응답한 설문입니다");
        }
        verify(resultRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("🔒 제출 - 로그인하지 않으면 거부한다 (제출자 식별이 감사 컬럼뿐이다)")
    void submitRequiresLogin() {
        given(infoRepository.findById(201L)).willReturn(java.util.Optional.of(openSurvey()));

        SurveyResponseSubmitDto dto = new SurveyResponseSubmitDto("홍길동",
                List.of(new SurveyResponseSubmitDto.Answer(301L, 401L, "예", null)));

        try (var mocked = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                    .thenReturn(java.util.Optional.empty());

            assertThatThrownBy(() -> service.submitResponse(201L, dto))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("로그인이 필요합니다");
        }
        verify(resultRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("제출 - 답변 N건이 응답 행 N개가 된다")
    void submitCreatesOneRowPerAnswer() {
        given(infoRepository.findById(201L)).willReturn(java.util.Optional.of(openSurvey()));
        given(resultRepository.existsBySrvySnAndFrstRgtrId(anyLong(), anyString())).willReturn(false);
        given(questionRepository.findBySrvySnOrderByQstnSnAsc(201L))
                .willReturn(List.of(question(301L, "질문1", "1"), question(302L, "질문2", "1")));
        given(articleRepository.findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(any()))
                .willReturn(List.of(article(401L, 301L, "예"), article(402L, 302L, "아니오")));

        SurveyResponseSubmitDto dto = new SurveyResponseSubmitDto("홍길동", List.of(
                new SurveyResponseSubmitDto.Answer(301L, 401L, "예", null),
                new SurveyResponseSubmitDto.Answer(302L, 402L, "아니오", null)));

        try (var mocked = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                    .thenReturn(java.util.Optional.of("user1"));

            int saved = service.submitResponse(201L, dto);
            assertThat(saved).isEqualTo(2);
        }

        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<List<SurveyResult>> captor =
                org.mockito.ArgumentCaptor.forClass(List.class);
        verify(resultRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(2);
        // 템플릿 ID 는 요청이 아니라 문항에서 가져온다 — 클라이언트가 임의 값을 심지 못하게 한다.
        assertThat(captor.getValue()).allSatisfy(r -> assertThat(r.getSrvyTmpltSn()).isEqualTo(101L));
    }

    // ---------- 기간 가드 (2026-09-05) ----------
    //
    // 종전에는 존재·중복만 검사해 종료된 설문·시작 전 설문에도 응답이 저장됐다. 같은 도메인의
    // 투표(OnlinePollService.vote)는 막고 있었다. 오늘 날짜에 의존하지 않도록 경계를 멀리 둔다.

    private static SurveyResponseSubmitDto oneAnswer() {
        return new SurveyResponseSubmitDto("홍길동",
                List.of(new SurveyResponseSubmitDto.Answer(301L, 401L, "예", null)));
    }

    @Test
    @DisplayName("🔒 제출 - 종료된 설문에는 응답할 수 없다")
    void submitRejectsClosedSurvey() {
        given(infoRepository.findById(201L)).willReturn(java.util.Optional.of(surveyWithPeriod("20000101", "20000131")));

        try (var mocked = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                    .thenReturn(java.util.Optional.of("user1"));

            assertThatThrownBy(() -> service.submitResponse(201L, oneAnswer()))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("이미 종료된 설문입니다")
                    .hasMessageContaining("2000-01-31");
        }
        verify(resultRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("🔒 제출 - 시작 전 설문에는 응답할 수 없다")
    void submitRejectsScheduledSurvey() {
        given(infoRepository.findById(201L)).willReturn(java.util.Optional.of(surveyWithPeriod("29990101", "29991231")));

        try (var mocked = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                    .thenReturn(java.util.Optional.of("user1"));

            assertThatThrownBy(() -> service.submitResponse(201L, oneAnswer()))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("아직 시작되지 않은 설문입니다")
                    .hasMessageContaining("2999-01-01");
        }
        verify(resultRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("제출 - 비어 있는 기간 경계는 열린 것으로 본다 (기간 없는 설문은 계속 응답 가능)")
    void submitAllowsUnboundedPeriod() {
        given(infoRepository.findById(201L)).willReturn(java.util.Optional.of(surveyWithPeriod(null, null)));
        given(resultRepository.existsBySrvySnAndFrstRgtrId(201L, "user1")).willReturn(false);
        given(questionRepository.findBySrvySnOrderByQstnSnAsc(201L)).willReturn(List.of(question(301L, "질문1", "1")));
        given(articleRepository.findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(any()))
                .willReturn(List.of(article(401L, 301L, "예")));

        try (var mocked = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                    .thenReturn(java.util.Optional.of("user1"));

            assertThat(service.submitResponse(201L, oneAnswer())).isEqualTo(1);
        }
        verify(resultRepository).saveAll(any());
    }

    @Test
    @DisplayName("🔒 제출 - 기간 값이 8자리 날짜가 아니면 판정 불가이며 열지 않는다")
    void submitRejectsMalformedPeriod() {
        given(infoRepository.findById(201L)).willReturn(java.util.Optional.of(surveyWithPeriod("2026-09-", "20261231")));

        try (var mocked = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mocked.when(nuri.business.security.util.SecurityUtil::getCurrentLoginId)
                    .thenReturn(java.util.Optional.of("user1"));

            assertThatThrownBy(() -> service.submitResponse(201L, oneAnswer()))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("설문 기간 정보를 확인할 수 없어");
        }
        verify(resultRepository, never()).saveAll(any());
    }
}
