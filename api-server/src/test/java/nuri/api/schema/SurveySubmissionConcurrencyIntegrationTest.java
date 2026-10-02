package nuri.api.schema;

import nuri.business.core.harness.QueryCountInspector;
import nuri.business.service.survey.SurveyResultService;
import nuri.business.service.survey.SurveyService;
import nuri.business.service.survey.dto.SurveyArticleDto;
import nuri.business.service.survey.dto.SurveyInfoDto;
import nuri.business.service.survey.dto.SurveyQuestionDto;
import nuri.business.service.survey.dto.SurveyResponseSubmitDto;
import nuri.business.service.survey.dto.SurveyResultDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class SurveySubmissionConcurrencyIntegrationTest {
    @Autowired private SurveyResultService service;
    @Autowired private SurveyService editor;
    @Autowired private EntityManager entityManager;
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
    private Long foreignSurvey;
    private List<String> measuredSql = List.of();
    private final List<String> cancellationUsers = new ArrayList<>();

    // [2026-10-01 결정 21] 새 설문은 작성 중(rls_yn='N')으로 시작하고 작성 중 설문 응답은 404 다 — 공개된 설문을 명시한다.
    @BeforeEach
    void prepareSurvey() {
        template = jdbc.queryForObject("INSERT INTO tb_srvy_tmplt DEFAULT VALUES RETURNING srvy_tmplt_sn", Long.class);
        survey = jdbc.queryForObject("""
                INSERT INTO tb_srvy_info (srvy_ttl, srvy_tmplt_sn, srvy_bgng_ymd, srvy_end_ymd, rls_yn)
                VALUES ('동시 제출 검증', ?, '20000101', '29991231', 'Y') RETURNING srvy_sn
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
        QueryCountInspector.clear();
        removeSurveyFixture(survey);
        if (foreignSurvey != null) removeSurveyFixture(foreignSurvey);
        jdbc.update("DELETE FROM tb_srvy_tmplt WHERE srvy_tmplt_sn=?", template);
        cancellationUsers.forEach(user -> jdbc.update("DELETE FROM tb_user_info WHERE user_id=?", user));
    }

    private void removeSurveyFixture(long surveyId) {
        jdbc.update("DELETE FROM tb_srvy_rslt WHERE srvy_sn=?", surveyId);
        jdbc.update("DELETE FROM tb_srvy_artcl WHERE srvy_sn=?", surveyId);
        jdbc.update("DELETE FROM tb_srvy_qstn WHERE srvy_sn=?", surveyId);
        jdbc.update("DELETE FROM tb_srvy_info WHERE srvy_sn=?", surveyId);
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

    enum Edit {
        QUESTION_TEXT, ARTICLE_TEXT, QUESTION_DELETE, ARTICLE_DELETE,
        QUESTION_ADD, ARTICLE_ADD, UNPUBLISH, SURVEY_DELETE
    }

    @ParameterizedTest
    @EnumSource(Edit.class)
    void submissionFirstSerializesEverySurveyMutation(Edit edit) throws Exception {
        var applied = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var firstPid = new AtomicInteger();
        String secondApplication = "survey-edit-after-submit-" + survey;
        try (var executor = Executors.newFixedThreadPool(2)) {
            var submission = executor.submit(() -> heldAction("survey-submit-leading-" + survey,
                    () -> { assertThat(service.submitResponse(survey, answers(false))).isEqualTo(2); return "saved"; },
                    applied, release, firstPid));
            java.util.concurrent.Future<String> mutation;
            try {
                awaitApplied(applied, submission, "선행 제출이 전체 응답을 저장");
                mutation = executor.submit(() -> transactionAction(secondApplication, () -> edit(edit)));
                assertWaitingOnSurvey(secondApplication, firstPid.get());
            } finally {
                release.countDown();
            }
            assertThat(submission.get(20, TimeUnit.SECONDS)).isEqualTo("saved");
            assertThat(mutation.get(20, TimeUnit.SECONDS)).isEqualTo(
                    edit == Edit.UNPUBLISH || edit == Edit.SURVEY_DELETE ? "edited" : "rejected:RESOURCE_IN_USE");
        }
        if (edit == Edit.SURVEY_DELETE) {
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_srvy_rslt WHERE srvy_sn=?", Integer.class, survey)).isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_srvy_info WHERE srvy_sn=?", Integer.class, survey)).isZero();
        } else {
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_srvy_rslt WHERE srvy_sn=?", Integer.class, survey)).isEqualTo(2);
            assertThat(jdbc.queryForObject("SELECT qstn_cn FROM tb_srvy_qstn WHERE srvy_qstn_sn=?", String.class, firstQuestion))
                    .isEqualTo("검증 문항");
            assertThat(jdbc.queryForObject("SELECT artcl_cn FROM tb_srvy_artcl WHERE srvy_artcl_sn=?", String.class, firstArticle))
                    .isEqualTo("검증 항목");
        }
    }

    @ParameterizedTest
    @EnumSource(Edit.class)
    void mutationFirstMakesSubmissionValidateTheCommittedSurvey(Edit edit) throws Exception {
        var applied = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var firstPid = new AtomicInteger();
        String secondApplication = "survey-submit-after-edit-" + survey;
        try (var executor = Executors.newFixedThreadPool(2)) {
            var mutation = executor.submit(() -> heldAction("survey-edit-leading-" + survey,
                    () -> edit(edit), applied, release, firstPid));
            java.util.concurrent.Future<String> submission;
            try {
                awaitApplied(applied, mutation, "선행 편집이 검증과 변경을 완료");
                submission = executor.submit(() -> transactionAction(secondApplication, () -> {
                    assertThat(service.submitResponse(survey, answers(false))).isEqualTo(2);
                    return "saved";
                }));
                assertWaitingOnSurvey(secondApplication, firstPid.get());
            } finally {
                release.countDown();
            }
            assertThat(mutation.get(20, TimeUnit.SECONDS)).isEqualTo("edited");
            assertThat(submission.get(20, TimeUnit.SECONDS)).isEqualTo(switch (edit) {
                case QUESTION_DELETE, ARTICLE_DELETE -> "rejected:INVALID_INPUT_VALUE";
                case UNPUBLISH, SURVEY_DELETE -> "rejected:RESOURCE_NOT_FOUND";
                default -> "saved";
            });
        }
        boolean rejected = edit == Edit.QUESTION_DELETE || edit == Edit.ARTICLE_DELETE
                || edit == Edit.UNPUBLISH || edit == Edit.SURVEY_DELETE;
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_srvy_rslt WHERE srvy_sn=?", Integer.class, survey))
                .isEqualTo(rejected ? 0 : 2);
        if (edit == Edit.QUESTION_TEXT) {
            assertThat(jdbc.queryForObject("SELECT qstn_cn FROM tb_srvy_qstn WHERE srvy_qstn_sn=?", String.class, firstQuestion))
                    .isEqualTo("수정 문항");
        } else if (edit == Edit.ARTICLE_TEXT) {
            assertThat(jdbc.queryForObject("SELECT artcl_cn FROM tb_srvy_artcl WHERE srvy_artcl_sn=?", String.class, firstArticle))
                    .isEqualTo("수정 선택");
        }
    }

    private String edit(Edit edit) {
        switch (edit) {
            case QUESTION_TEXT -> editor.updateQuestion(SurveyQuestionDto.builder().srvyQstnSn(firstQuestion)
                    .qstnSn(1L).qstnCn("수정 문항").maxChcCnt(1).build());
            case ARTICLE_TEXT -> editor.updateItem(SurveyArticleDto.builder().srvyArtclSn(firstArticle)
                    .artclSn(1L).artclCn("수정 선택").etcAnsYn("N").build());
            case QUESTION_DELETE -> editor.deleteQuestion(survey, firstQuestion);
            case ARTICLE_DELETE -> editor.deleteItem(firstArticle);
            // 선택지가 없는 새 문항은 기존 제출 정책에서 답할 수 있는 문항에 포함되지 않는다.
            case QUESTION_ADD -> editor.insertQuestion(SurveyQuestionDto.builder().srvySn(survey)
                    .qstnCn("새 문항").maxChcCnt(1).build());
            case ARTICLE_ADD -> editor.insertItem(SurveyArticleDto.builder().srvyQstnSn(firstQuestion)
                    .artclSn(3L).artclCn("새 선택").etcAnsYn("N").build());
            case UNPUBLISH -> editor.updateSurvey(SurveyInfoDto.builder().srvySn(survey).srvyTmpltSn(template)
                    .srvyTtl("동시 제출 검증").srvyBgngYmd("20000101").srvyEndYmd("29991231").rlsYn("N").build());
            // 전체 설문 삭제는 응답을 함께 정리하는 기존 명시적 정책을 보존한다.
            case SURVEY_DELETE -> editor.deleteSurvey(survey);
        }
        return "edited";
    }

    @Test
    void waitingEditorLoadsQuestionAfterTheLeadingEditAndSubmissionCommit() throws Exception {
        var applied = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var firstPid = new AtomicInteger();
        String secondApplication = "survey-stale-question-" + survey;
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> heldAction("survey-edit-and-submit-" + survey, () -> {
                edit(Edit.QUESTION_TEXT);
                assertThat(service.submitResponse(survey, answers(false))).isEqualTo(2);
                return "saved";
            }, applied, release, firstPid));
            java.util.concurrent.Future<String> second;
            try {
                awaitApplied(applied, first, "선행 문항 변경과 제출을 저장");
                second = executor.submit(() -> transactionAction(secondApplication, () -> {
                    editor.updateQuestion(SurveyQuestionDto.builder().srvyQstnSn(firstQuestion).qstnSn(8L)
                            .qstnCn("검증 문항").maxChcCnt(1).build());
                    return "edited";
                }));
                assertWaitingOnSurvey(secondApplication, firstPid.get());
            } finally {
                release.countDown();
            }
            assertThat(first.get(20, TimeUnit.SECONDS)).isEqualTo("saved");
            assertThat(second.get(20, TimeUnit.SECONDS)).isEqualTo("rejected:RESOURCE_IN_USE");
        }
        assertThat(jdbc.queryForObject("SELECT qstn_cn FROM tb_srvy_qstn WHERE srvy_qstn_sn=?", String.class, firstQuestion))
                .isEqualTo("수정 문항");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_srvy_rslt WHERE srvy_sn=?", Integer.class, survey)).isEqualTo(2);
    }

    private String heldAction(String application, Supplier<String> action, CountDownLatch applied,
                              CountDownLatch release, AtomicInteger backendPid) {
        return transactionAction(application, () -> {
            backendPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
            String outcome = action.get();
            entityManager.flush();
            applied.countDown();
            try {
                assertThat(release.await(20, TimeUnit.SECONDS)).as("후행 요청의 실제 survey 잠금 대기 확인").isTrue();
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Survey concurrency test interrupted", interrupted);
            }
            return outcome;
        });
    }

    private void awaitApplied(CountDownLatch applied, java.util.concurrent.Future<?> action, String description)
            throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        while (!applied.await(20, TimeUnit.MILLISECONDS) && System.nanoTime() < deadline) {
            // 선행 작업 실패를 잠금 대기 시간 초과로 숨기지 않는다.
            if (action.isDone()) action.get(1, TimeUnit.SECONDS);
        }
        assertThat(applied.getCount()).as(description).isZero();
    }

    private String transactionAction(String application, Supplier<String> action) {
        authenticate("survey-race-user");
        try {
            return new TransactionTemplate(transactionManager).execute(status -> {
                jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                return action.get();
            });
        } catch (BusinessException rejected) {
            return "rejected:" + rejected.getErrorCode();
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void assertWaitingOnSurvey(String application, int blockerPid) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        boolean waiting;
        do {
            waiting = Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS (
                        SELECT 1 FROM pg_stat_activity
                        WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock'
                          AND ? = ANY(pg_blocking_pids(pid)) AND lower(query) LIKE '%tb_srvy_info%'
                    )
                    """, Boolean.class, application, blockerPid));
            if (!waiting) Thread.sleep(20);
        } while (!waiting && System.nanoTime() < deadline);
        assertThat(waiting).as("후행 트랜잭션은 응답 검사·자식 조회 전에 동일 survey 행에서 대기").isTrue();
    }

    @Test
    void responseListBatchesChoiceLabelsAcrossQuestionsAndDeduplicatesArticleIds() {
        String respondent = "choice-batch-" + survey;
        List<Long> articles = List.of(firstArticle, secondArticle, thirdArticle, fourthArticle);
        List<Long> questions = List.of(firstQuestion, firstQuestion, secondQuestion, secondQuestion);
        List<String> labels = List.of("첫 문항 첫 선택", "첫 문항 둘째 선택", "둘째 문항 첫 선택", "둘째 문항 둘째 선택");
        List<Long> responseIds = new ArrayList<>();
        for (int index = 0; index < articles.size(); index++) {
            jdbc.update("UPDATE tb_srvy_artcl SET artcl_cn=? WHERE srvy_artcl_sn=? AND srvy_sn=?",
                    labels.get(index), articles.get(index), survey);
            for (int respondentIndex = 0; respondentIndex < 2; respondentIndex++) {
                int answerSet = (index % 2) * 2 + respondentIndex;
                responseIds.add(response(questions.get(index), articles.get(index), respondent,
                        "choice-user-" + answerSet, null, null));
            }
        }

        Page<SurveyResultDto> page = measuredResponseList(respondent, 8);

        assertThat(page.getTotalElements()).isEqualTo(8);
        assertThat(page.getContent()).extracting(SurveyResultDto::srvyRspnsSn).containsExactlyElementsOf(responseIds);
        assertThat(page.getContent()).extracting(SurveyResultDto::srvyQstnSn)
                .containsExactly(firstQuestion, firstQuestion, firstQuestion, firstQuestion,
                        secondQuestion, secondQuestion, secondQuestion, secondQuestion);
        assertThat(page.getContent()).extracting(SurveyResultDto::rspdntAnsCn)
                .containsExactly(labels.get(0), labels.get(0), labels.get(1), labels.get(1),
                        labels.get(2), labels.get(2), labels.get(3), labels.get(3));
        List<String> articleQueries = measuredArticleQueries(3);
        assertThat(articleQueries).as("여러 문항의 선택 내용은 한 번에 조회").hasSize(1);
        // 동일 선택을 한 응답 8행은 보존하되 현재 PG/Hibernate IN 조회의 바인드는 고유 ID 4개다.
        // 4와 8은 모두 2의 거듭제곱이므로 IN 절 padding 유무로 중복 제거 판정이 달라지지 않는다.
        assertThat(articleQueries.getFirst().chars().filter(character -> character == '?').count())
                .as("응답 중복을 제거하지 않고 선택 조회 ID만 중복 제거").isEqualTo(4);
    }

    @Test
    void responseListPreservesTextAnswersAndSkipsEmptyChoiceQueries() {
        String respondent = "text-answers-" + survey;
        long textResponse = response(firstQuestion, firstArticle, respondent, "text-user", "직접 작성한 답", null);
        long otherResponse = response(secondQuestion, thirdArticle, respondent, "other-user", null, "직접 작성한 기타 답");

        Page<SurveyResultDto> page = measuredResponseList(respondent, 8);

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).extracting(SurveyResultDto::srvyRspnsSn)
                .containsExactly(textResponse, otherResponse);
        assertThat(page.getContent()).extracting(SurveyResultDto::rspdntAnsCn).containsExactly("직접 작성한 답", null);
        assertThat(page.getContent()).extracting(SurveyResultDto::etcAnsCn).containsExactly(null, "직접 작성한 기타 답");
        assertThat(measuredArticleQueries(2)).as("선택 내용을 보충할 응답이 없으면 항목 조회 없음").isEmpty();

        Page<SurveyResultDto> empty = measuredResponseList("no-responses-" + survey, 8);

        assertThat(empty.getTotalElements()).isZero();
        assertThat(empty.getContent()).isEmpty();
        assertThat(measuredArticleQueries(2)).as("빈 응답 페이지의 항목 조회 없음").isEmpty();
    }

    @Test
    void responseListDoesNotExposeForeignSurveyOrQuestionLabels() {
        String respondent = "choice-ownership-" + survey;
        jdbc.update("UPDATE tb_srvy_artcl SET artcl_cn=? WHERE srvy_artcl_sn=? AND srvy_sn=?",
                "열람 가능한 선택", firstArticle, survey);
        jdbc.update("UPDATE tb_srvy_artcl SET artcl_cn=? WHERE srvy_artcl_sn=? AND srvy_sn=?",
                "다른 문항의 비공개 선택", thirdArticle, survey);
        foreignSurvey = jdbc.queryForObject("""
                INSERT INTO tb_srvy_info (srvy_ttl, srvy_tmplt_sn, srvy_bgng_ymd, srvy_end_ymd, rls_yn)
                VALUES ('소속 혼입 검증', ?, '20000101', '29991231', 'Y') RETURNING srvy_sn
                """, Long.class, template);
        long foreignQuestion = jdbc.queryForObject("""
                INSERT INTO tb_srvy_qstn (srvy_sn, srvy_tmplt_sn, qstn_sn, qstn_cn, max_chc_cnt)
                VALUES (?, ?, 1, '다른 설문의 문항', 1) RETURNING srvy_qstn_sn
                """, Long.class, foreignSurvey, template);
        long foreignArticle = jdbc.queryForObject("""
                INSERT INTO tb_srvy_artcl (srvy_sn, srvy_tmplt_sn, srvy_qstn_sn, artcl_sn, artcl_cn, etc_ans_yn)
                VALUES (?, ?, ?, 1, '다른 설문의 비공개 선택', 'N') RETURNING srvy_artcl_sn
                """, Long.class, foreignSurvey, template, foreignQuestion);
        long ownResponse = response(firstQuestion, firstArticle, respondent, "own-user", null, null);
        // 각 FK는 유효하지만 복합 소속이 다른 실제 행이다. 물리 제약을 끄거나 없는 ID를 만들지 않는다.
        long wrongQuestionResponse = response(firstQuestion, thirdArticle, respondent, "wrong-question", null, null);
        long wrongSurveyResponse = response(foreignQuestion, foreignArticle, respondent, "wrong-survey", null, null);

        Page<SurveyResultDto> page = measuredResponseList(respondent, 8);

        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getContent()).extracting(SurveyResultDto::srvyRspnsSn)
                .containsExactly(ownResponse, wrongQuestionResponse, wrongSurveyResponse);
        assertThat(page.getContent()).extracting(SurveyResultDto::srvySn).containsOnly(survey);
        assertThat(page.getContent()).extracting(SurveyResultDto::srvyQstnSn)
                .containsExactly(firstQuestion, firstQuestion, foreignQuestion);
        assertThat(page.getContent()).extracting(SurveyResultDto::rspdntAnsCn)
                .containsExactly("열람 가능한 선택", null, null);
        assertThat(measuredArticleQueries(3)).as("소속 검증도 단일 항목 조회 결과에서 수행").hasSize(1);
    }

    private Page<SurveyResultDto> measuredResponseList(String respondent, int pageSize) {
        QueryCountInspector.start();
        try {
            return service.getResponseList(respondent, PageRequest.of(0, pageSize, Sort.by("srvyRspnsSn")));
        } finally {
            measuredSql = QueryCountInspector.getQueries();
            QueryCountInspector.clear();
        }
    }

    private List<String> measuredArticleQueries(int maximumQueries) {
        // JDBC seed/cleanup은 측정 밖이다. 0이면 계측 미연결이므로 성공으로 받아들이지 않는다.
        assertThat(measuredSql.size()).as("실제 응답 조회 + 선택적 count + 선택 항목 일괄 조회")
                .isBetween(1, maximumQueries);
        return measuredSql.stream().filter(sql -> sql.toLowerCase(Locale.ROOT).contains("tb_srvy_artcl")).toList();
    }

    private long response(long question, long article, String respondent, String author, String answer, String otherAnswer) {
        return jdbc.queryForObject("""
                INSERT INTO tb_srvy_rslt (srvy_sn, srvy_tmplt_sn, srvy_qstn_sn, srvy_artcl_sn,
                                          rspdnt_ans_cn, rspns_nm, etc_ans_cn, frst_rgtr_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING srvy_rspns_sn
                """, Long.class, survey, template, question, article, answer, respondent, otherAnswer, author);
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

    @Test
    void cancellationRemovesAllQuestionsAndChoicesButPreservesOtherPeopleAndSurveys() {
        String author = cancellationUser("A");
        String other = cancellationUser("B");
        jdbc.update("UPDATE tb_srvy_qstn SET max_chc_cnt=2 WHERE srvy_qstn_sn=?", firstQuestion);
        authenticate(author);
        assertThat(service.submitResponse(survey, new SurveyResponseSubmitDto("표시명", List.of(
                new SurveyResponseSubmitDto.Answer(firstQuestion, firstArticle, null, null),
                new SurveyResponseSubmitDto.Answer(firstQuestion, secondArticle, null, null),
                new SurveyResponseSubmitDto.Answer(secondQuestion, thirdArticle, null, null))))).isEqualTo(3);
        long anchor = responseAnchor(author);
        authenticate(other);
        service.submitResponse(survey, answers(true));
        foreignSurvey = jdbc.queryForObject("INSERT INTO tb_srvy_info(srvy_ttl,srvy_tmplt_sn,rls_yn) VALUES ('다른 설문',?,'Y') RETURNING srvy_sn", Long.class, template);
        long foreignQuestion = jdbc.queryForObject("INSERT INTO tb_srvy_qstn(srvy_sn,srvy_tmplt_sn,max_chc_cnt) VALUES (?,?,1) RETURNING srvy_qstn_sn", Long.class, foreignSurvey, template);
        long foreignArticle = jdbc.queryForObject("INSERT INTO tb_srvy_artcl(srvy_sn,srvy_tmplt_sn,srvy_qstn_sn) VALUES (?,?,?) RETURNING srvy_artcl_sn", Long.class, foreignSurvey, template, foreignQuestion);
        jdbc.update("INSERT INTO tb_srvy_rslt(srvy_sn,srvy_tmplt_sn,srvy_qstn_sn,srvy_artcl_sn,frst_rgtr_id) VALUES (?,?,?,?,?)", foreignSurvey, template, foreignQuestion, foreignArticle, author);

        authenticateCancellation(author);
        service.cancelSubmission(anchor);
        assertThat(answerCount(author)).isZero();
        assertThat(answerCount(other)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_srvy_rslt WHERE srvy_sn=?", Integer.class, foreignSurvey)).isEqualTo(1);
        assertThat(service.getStats(survey)).extracting(nuri.business.service.survey.dto.SurveyStatsDto::count).contains(1L);
        authenticate(author);
        assertThat(service.submitResponse(survey, answers(false))).isEqualTo(2);
        authenticateCancellation(author);
        service.cancelSubmission(responseAnchor(author));
        jdbc.update("UPDATE tb_srvy_info SET srvy_bgng_ymd='20000101',srvy_end_ymd='20000102' WHERE srvy_sn=?", survey);
        authenticate(author);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.submitResponse(survey, answers(false)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void cancellationRejectsUnknownIdentityAndRollsBackTheWholeGroup() {
        String author = cancellationUser("A");
        authenticate(author);
        service.submitResponse(survey, answers(false));
        long anchor = responseAnchor(author);
        authenticateCancellation(author);
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            service.cancelSubmission(anchor);
            status.setRollbackOnly();
        });
        assertThat(answerCount(author)).isEqualTo(2);
        jdbc.update("UPDATE tb_srvy_rslt SET frst_rgtr_id=NULL WHERE srvy_rspns_sn=?", anchor);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.cancelSubmission(anchor))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", nuri.foundation.core.exception.CommonErrorCode.INVALID_STATE);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_srvy_rslt WHERE srvy_sn=?", Integer.class, survey)).isEqualTo(2);
    }

    @Test
    void concurrentCancellationAndResubmissionNeverLeavePartialAnswers() throws Exception {
        String author = cancellationUser("A");
        authenticate(author);
        service.submitResponse(survey, answers(false));
        long anchor = responseAnchor(author);
        String application = "survey-cancel-" + survey;
        try (var executor = Executors.newFixedThreadPool(2); var blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try (var lock = blocker.prepareStatement("SELECT srvy_sn FROM tb_srvy_info WHERE srvy_sn=? FOR UPDATE")) {
                lock.setLong(1, survey);
                lock.executeQuery().close();
            }
            var cancellation = executor.submit(() -> concurrentCancellationAction(author, application, () -> {
                service.cancelSubmission(anchor);
                return "cancelled";
            }));
            var submission = executor.submit(() -> {
                try { return concurrentCancellationAction(author, application, () -> {
                    service.submitResponse(survey, answers(true));
                    return "submitted";
                }); }
                catch (BusinessException rejected) {
                    assertThat(rejected).hasMessage("이미 응답한 설문입니다.");
                    return "duplicate";
                }
            });
            try {
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                int waiting;
                do {
                    waiting = jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock'", Integer.class, application);
                    if (waiting < 2) Thread.sleep(20);
                } while (waiting < 2 && System.nanoTime() < deadline);
                assertThat(waiting).isEqualTo(2);
            } finally { blocker.rollback(); }
            assertThat(cancellation.get(20, TimeUnit.SECONDS)).isEqualTo("cancelled");
            String outcome = submission.get(20, TimeUnit.SECONDS);
            assertThat(answerCount(author)).isEqualTo(outcome.equals("submitted") ? 2 : 0);
        }
    }

    private String concurrentCancellationAction(String author, String application, java.util.function.Supplier<String> action) {
        authenticateCancellation(author);
        try {
            return new TransactionTemplate(transactionManager).execute(status -> {
                jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                return action.get();
            });
        } finally { SecurityContextHolder.clearContext(); }
    }

    @Test
    void concurrentCancellationCommitsExactlyOnceAndNeverDeletesAnotherSubmission() throws Exception {
        String author = cancellationUser("A");
        authenticate(author);
        service.submitResponse(survey, answers(false));
        long anchor = responseAnchor(author);
        String application = "survey-cancel-twice-" + survey;
        try (var executor = Executors.newFixedThreadPool(2); var blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try (var lock = blocker.prepareStatement("SELECT srvy_sn FROM tb_srvy_info WHERE srvy_sn=? FOR UPDATE")) {
                lock.setLong(1, survey);
                lock.executeQuery().close();
            }
            java.util.concurrent.Callable<String> cancel = () -> {
                try { return concurrentCancellationAction(author, application, () -> {
                    service.cancelSubmission(anchor);
                    return "cancelled";
                }); }
                catch (BusinessException rejected) {
                    assertThat(rejected.getErrorCode()).isEqualTo(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND);
                    return "already-cancelled";
                }
            };
            var first = executor.submit(cancel);
            var second = executor.submit(cancel);
            try {
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                int waiting;
                do {
                    waiting = jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock'", Integer.class, application);
                    if (waiting < 2) Thread.sleep(20);
                } while (waiting < 2 && System.nanoTime() < deadline);
                assertThat(waiting).isEqualTo(2);
            } finally { blocker.rollback(); }
            assertThat(List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder("cancelled", "already-cancelled");
        }
        assertThat(answerCount(author)).isZero();
    }

    private String cancellationUser(String suffix) {
        String user = "SC" + survey + suffix;
        jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,pswd,user_nm,user_stts_cd,crt_dt) VALUES (?,?,'test-only-unusable','동명이인','P','2000-01-01')", user, user);
        cancellationUsers.add(user);
        return user;
    }

    private long responseAnchor(String author) {
        return jdbc.queryForObject("SELECT min(srvy_rspns_sn) FROM tb_srvy_rslt WHERE srvy_sn=? AND frst_rgtr_id=?", Long.class, survey, author);
    }

    private int answerCount(String author) {
        return jdbc.queryForObject("SELECT count(*) FROM tb_srvy_rslt WHERE srvy_sn=? AND frst_rgtr_id=?", Integer.class, survey, author);
    }

    private void authenticateCancellation(String loginId) {
        var principal = CustomUserDetails.builder().userId(loginId).esntlId(loginId)
                .enabled(true).permissions(List.of("SURVEY_RSP_DELETE")).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
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
