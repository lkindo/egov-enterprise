package nuri.api.schema;

import nuri.business.domain.template.TemplateRepository;
import nuri.business.service.template.TmplatInfoService;
import nuri.business.service.template.dto.TemplateDto;
import nuri.business.service.template.dto.TemplateMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.AdditionalAnswers.delegatesTo;

/** Actual JPA writes on disposable PostgreSQL: creation must never merge an existing identifier. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class TemplateCreationIntegrityIntegrationTest {
    @Autowired private TmplatInfoService service;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    @Autowired private TemplateRepository repository;
    @Autowired private TemplateMapper mapper;
    private String templateId;

    @BeforeEach
    void prepareIdentity() {
        templateId = "T_" + UUID.randomUUID().toString().replace("-", "").substring(0, 18);
        authenticateCreator();
    }

    @AfterEach
    void removeOwnFixture() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_tmplt_info WHERE tmplt_id=?", templateId);
    }

    @Test
    void creatingAnExistingIdRejectsWithoutChangingContentOrAudit() {
        service.insertTmplatInfo(template("original"));
        var original = jdbc.queryForMap("SELECT * FROM tb_tmplt_info WHERE tmplt_id=?", templateId);

        assertThatThrownBy(() -> service.insertTmplatInfo(template("replacement")))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.DUPLICATE_RESOURCE);

        assertThat(jdbc.queryForMap("SELECT * FROM tb_tmplt_info WHERE tmplt_id=?", templateId))
                .isEqualTo(original);
    }

    @Test
    void staleAbsenceCheckStillCannotMergeAnExistingTemplate() {
        service.insertTmplatInfo(template("original"));
        var original = jdbc.queryForMap("SELECT * FROM tb_tmplt_info WHERE tmplt_id=?", templateId);
        // Model another transaction committing after the absence check; JPA and the DB remain real.
        var staleRepository = mock(TemplateRepository.class, delegatesTo(repository));
        doReturn(false).when(staleRepository).existsById(templateId);
        var staleCreator = new TmplatInfoService(staleRepository, mapper, List.of());

        assertThatThrownBy(() -> new TransactionTemplate(transactionManager).executeWithoutResult(
                status -> staleCreator.insertTmplatInfo(template("replacement"))))
                .isInstanceOf(DataIntegrityViolationException.class);

        assertThat(jdbc.queryForMap("SELECT * FROM tb_tmplt_info WHERE tmplt_id=?", templateId))
                .isEqualTo(original);
    }

    @Test
    void concurrentCreationCommitsExactlyOneTemplateWithoutReplacingTheWinner() throws Exception {
        var inserted = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> {
                authenticateCreator();
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        service.insertTmplatInfo(template("winner"));
                        repository.flush();
                        inserted.countDown();
                        await(release);
                    });
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            try {
                boolean ready = inserted.await(15, TimeUnit.SECONDS);
                if (!ready && first.isDone()) first.get(1, TimeUnit.SECONDS);
                assertThat(ready).as("선행 INSERT가 DB에 반영되어야 한다").isTrue();
                var second = executor.submit(() -> {
                    authenticateCreator();
                    try {
                        assertThatThrownBy(() -> new TransactionTemplate(transactionManager)
                                .executeWithoutResult(status -> {
                                    jdbc.queryForObject("SELECT set_config('application_name', ?, true)",
                                            String.class, "template-create-contender");
                                    service.insertTmplatInfo(template("loser"));
                                })).isInstanceOf(DataIntegrityViolationException.class);
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                });
                try {
                    long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                    int waiting;
                    do {
                        waiting = jdbc.queryForObject("""
                                SELECT count(*) FROM pg_stat_activity
                                WHERE datname=current_database() AND application_name='template-create-contender'
                                  AND wait_event_type='Lock'
                                """, Integer.class);
                        if (waiting == 0) Thread.sleep(20);
                    } while (waiting == 0 && System.nanoTime() < deadline);
                    assertThat(waiting).as("실제 INSERT의 PK 경합").isEqualTo(1);
                } finally {
                    release.countDown();
                }
                first.get(20, TimeUnit.SECONDS);
                second.get(20, TimeUnit.SECONDS);
            } finally {
                release.countDown();
            }
        }
        assertThat(jdbc.queryForList("SELECT tmplt_nm FROM tb_tmplt_info WHERE tmplt_id=?", String.class, templateId))
                .containsExactly("winner");
    }

    private TemplateDto template(String name) {
        return TemplateDto.builder().tmpltId(templateId).tmpltNm(name).tmpltSeCd("TMPT01")
                .tmpltPath("/" + name).useYn("Y").build();
    }

    private static void authenticateCreator() {
        var principal = CustomUserDetails.builder().userId("template-creator").esntlId("TEMPLATE_CREATOR")
                .enabled(true).permissions(List.of("TEMPLATE_CREATE")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(25, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new AssertionError(failure);
        }
    }
}
