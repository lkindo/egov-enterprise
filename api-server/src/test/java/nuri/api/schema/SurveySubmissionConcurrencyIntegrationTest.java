package nuri.api.schema;

import nuri.business.service.survey.SurveyResultService;
import nuri.business.service.survey.dto.SurveyResponseSubmitDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@SpringBootTest
@ActiveProfiles({"test", "tc"})
class SurveySubmissionConcurrencyIntegrationTest {
    @Autowired private SurveyResultService service;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DataSource dataSource;
    @Autowired private PlatformTransactionManager transactionManager;

    private long template;
    private long survey;
    private long firstQuestion;
    private long secondQuestion;
    private long firstArticle;
    private long secondArticle;
    private long thirdArticle;
    private long fourthArticle;

    @BeforeEach
    void prepareSurvey() {
        template = jdbc.queryForObject("INSERT INTO tb_srvy_tmplt DEFAULT VALUES RETURNING srvy_tmplt_sn", Long.class);
        survey = jdbc.queryForObject("""
                INSERT INTO tb_srvy_info (srvy_ttl, srvy_tmplt_sn, srvy_bgng_ymd, srvy_end_ymd)
                VALUES ('동시 제출 검증', ?, '20000101', '29991231') RETURNING srvy_sn
                """, Long.class, template);
        firstQuestion = question(1);
        secondQuestion = question(2);
        firstArticle = article(firstQuestion, 1);
        secondArticle = article(firstQuestion, 2);
        thirdArticle = article(secondQuestion, 1);
        fourthArticle = article(secondQuestion, 2);
    }

    @AfterEach
    void removeOwnFixture() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_srvy_rslt WHERE srvy_sn=?", survey);
        jdbc.update("DELETE FROM tb_srvy_artcl WHERE srvy_sn=?", survey);
        jdbc.update("DELETE FROM tb_srvy_qstn WHERE srvy_sn=?", survey);
        jdbc.update("DELETE FROM tb_srvy_info WHERE srvy_sn=?", survey);
        jdbc.update("DELETE FROM tb_srvy_tmplt WHERE srvy_tmplt_sn=?", template);
    }

    @Test
    void concurrentDifferentAnswersFromSameUserCommitExactlyOneCompleteSubmission() throws Exception {
        var ready = new CountDownLatch(2);
        try (var executor = Executors.newFixedThreadPool(2);
             var blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try (var statement = blocker.prepareStatement("SELECT srvy_sn FROM tb_srvy_info WHERE srvy_sn=? FOR UPDATE")) {
                statement.setLong(1, survey);
                statement.executeQuery().close();
            }
            var first = executor.submit(() -> submit(answers(false), "survey-submit-first", ready));
            var second = executor.submit(() -> submit(answers(true), "survey-submit-second", ready));
            try {
                assertThat(ready.await(15, TimeUnit.SECONDS)).isTrue();
                // 양쪽 요청이 실제 DB 잠금에서 대기할 때 해제한다. 임의 sleep으로 경합을 추정하지 않는다.
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                int waiting;
                do {
                    waiting = jdbc.queryForObject("""
                            SELECT count(*) FROM pg_stat_activity
                            WHERE datname=current_database() AND application_name LIKE 'survey-submit-%'
                              AND wait_event_type='Lock'
                            """, Integer.class);
                    if (waiting < 2) Thread.sleep(20);
                } while (waiting < 2 && System.nanoTime() < deadline);
                assertThat(waiting).as("두 실제 트랜잭션의 잠금 경합").isEqualTo(2);
            } finally {
                blocker.rollback();
            }
            assertThat(List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder("saved", "duplicate");
        }
        List<Long> saved = jdbc.queryForList(
                "SELECT srvy_artcl_sn FROM tb_srvy_rslt WHERE srvy_sn=? ORDER BY srvy_artcl_sn", Long.class, survey);
        assertThat(saved).isIn(List.of(firstArticle, thirdArticle), List.of(secondArticle, fourthArticle));
        assertThat(jdbc.queryForObject("SELECT count(DISTINCT frst_rgtr_id) FROM tb_srvy_rslt WHERE srvy_sn=?", Integer.class, survey))
                .isEqualTo(1);
    }

    @Test
    void rolledBackSubmissionCanRetryAndOtherUserCanSubmitMultipleAnswers() {
        authenticate("survey-lock-user");
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            assertThat(service.submitResponse(survey, answers(false))).isEqualTo(2);
            status.setRollbackOnly();
        });
        assertThat(service.submitResponse(survey, answers(true))).isEqualTo(2);
        authenticate("survey-other-user");
        assertThat(service.submitResponse(survey, answers(false))).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_srvy_rslt WHERE srvy_sn=?", Integer.class, survey)).isEqualTo(4);
    }

    private String submit(SurveyResponseSubmitDto answers, String name, CountDownLatch ready) {
        authenticate("survey-lock-user");
        try {
            return new TransactionTemplate(transactionManager).execute(status -> {
                jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, name);
                ready.countDown();
                assertThat(service.submitResponse(survey, answers)).isEqualTo(2);
                return "saved";
            });
        } catch (BusinessException failure) {
            assertThat(failure).hasMessage("이미 응답한 설문입니다.");
            return "duplicate";
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void authenticate(String loginId) {
        var principal = CustomUserDetails.builder().userId(loginId).esntlId("SURVEY_TEST_INTERNAL").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private SurveyResponseSubmitDto answers(boolean alternative) {
        return new SurveyResponseSubmitDto("검증 응답자", List.of(
                new SurveyResponseSubmitDto.Answer(firstQuestion, alternative ? secondArticle : firstArticle, "답변", null),
                new SurveyResponseSubmitDto.Answer(secondQuestion, alternative ? fourthArticle : thirdArticle, "답변", null)));
    }

    private long question(int order) {
        return jdbc.queryForObject("""
                INSERT INTO tb_srvy_qstn (srvy_sn, srvy_tmplt_sn, qstn_sn, qstn_cn, max_chc_cnt)
                VALUES (?, ?, ?, '검증 문항', 1) RETURNING srvy_qstn_sn
                """, Long.class, survey, template, order);
    }

    private long article(long question, int order) {
        return jdbc.queryForObject("""
                INSERT INTO tb_srvy_artcl (srvy_sn, srvy_tmplt_sn, srvy_qstn_sn, artcl_sn, artcl_cn, etc_ans_yn)
                VALUES (?, ?, ?, ?, '검증 항목', 'N') RETURNING srvy_artcl_sn
                """, Long.class, survey, template, question, order);
    }
}
