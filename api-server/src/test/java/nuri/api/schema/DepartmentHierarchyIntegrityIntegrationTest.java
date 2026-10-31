package nuri.api.schema;

import jakarta.persistence.EntityManager;
import nuri.business.service.department.DeptManageService;
import nuri.business.service.department.dto.DeptManageDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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

/** 부서 계층의 최종 그래프와 서로 반대인 동시 이동을 실제 PostgreSQL 트랜잭션으로 확인한다. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class DepartmentHierarchyIntegrityIntegrationTest {
    @Autowired private DeptManageService departments;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;
    @Autowired private PlatformTransactionManager transactionManager;

    private String fixture;
    private String first;
    private String second;

    @BeforeEach
    void createOnlyOwnDepartments() {
        fixture = "DH" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        first = fixture + "A";
        second = fixture + "B";
        for (String id : List.of(first, second)) {
            jdbc.update("INSERT INTO tb_ognz_info(ognz_id,ognz_nm,sort_ordr) VALUES (?,?,0)", id, id);
        }
        authenticate();
    }

    @AfterEach
    void removeOnlyOwnDepartments() {
        SecurityContextHolder.clearContext();
        jdbc.update("UPDATE tb_ognz_info SET up_ognz_id=NULL WHERE ognz_id IN (?,?)", first, second);
        jdbc.update("DELETE FROM tb_ognz_info WHERE ognz_id IN (?,?)", first, second);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void validFinalGraphCommitsInEitherBatchOrder(boolean reverse) {
        jdbc.update("UPDATE tb_ognz_info SET up_ognz_id=? WHERE ognz_id=?", first, second);
        var parentMove = move(first, second);
        var childMove = move(second, null);

        departments.updateDeptHierarchy(reverse ? List.of(childMove, parentMove) : List.of(parentMove, childMove));

        assertThat(parentOf(first)).isEqualTo(second);
        assertThat(parentOf(second)).isNull();
    }

    @Test
    void finalCycleRollsBackTheWholeBatch() {
        assertThatThrownBy(() -> departments.updateDeptHierarchy(List.of(move(first, second), move(second, first))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(parentOf(first)).isNull();
        assertThat(parentOf(second)).isNull();
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void opposingConcurrentMovesRecheckTheCommittedParentGraph(boolean reverse) throws Exception {
        String child = reverse ? second : first;
        String parent = reverse ? first : second;
        String application = fixture + "contender";
        var ready = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var leading = executor.submit(() -> {
                authenticate();
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        departments.updateDeptHierarchy(List.of(move(child, parent)));
                        entityManager.flush();
                        ready.countDown();
                        await(release);
                    });
                } finally { SecurityContextHolder.clearContext(); }
            });
            try {
                assertThat(ready.await(15, TimeUnit.SECONDS)).isTrue();
                var contender = executor.submit(() -> {
                    authenticate();
                    try {
                        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                            departments.updateDeptHierarchy(List.of(move(parent, child)));
                        });
                        return null;
                    } catch (BusinessException rejected) {
                        return rejected.getErrorCode();
                    } finally { SecurityContextHolder.clearContext(); }
                });
                try { waitForDatabaseLock(application); }
                finally { release.countDown(); }
                leading.get(20, TimeUnit.SECONDS);
                assertThat(contender.get(20, TimeUnit.SECONDS)).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
                assertThat(parentOf(child)).isEqualTo(parent);
                assertThat(parentOf(parent)).isNull();
            } finally { release.countDown(); }
        }
    }

    @Test
    void generalEditWaitsForHierarchyAndPreservesItsCommittedParentAndOrder() throws Exception {
        String application = fixture + "nameedit";
        String renamed = fixture + " renamed";
        var ready = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var hierarchy = executor.submit(() -> {
                authenticate();
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        departments.updateDeptHierarchy(List.of(move(first, second)));
                        entityManager.flush();
                        ready.countDown();
                        await(release);
                    });
                } finally { SecurityContextHolder.clearContext(); }
            });
            try {
                assertThat(ready.await(15, TimeUnit.SECONDS)).isTrue();
                var nameEdit = executor.submit(() -> {
                    authenticate();
                    try {
                        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                            jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                            departments.updateDeptManage(DeptManageDto.builder().ognzId(first)
                                    .ognzNm(renamed).ognzExpln("updated description").build());
                        });
                    } finally { SecurityContextHolder.clearContext(); }
                });
                try { waitForDatabaseLock(application); }
                finally { release.countDown(); }
                hierarchy.get(20, TimeUnit.SECONDS);
                nameEdit.get(20, TimeUnit.SECONDS);
                // An unlocked read followed by Hibernate's full-row UPDATE would restore NULL / 0 here.
                assertThat(parentOf(first)).isEqualTo(second);
                assertThat(jdbc.queryForObject("SELECT sort_ordr FROM tb_ognz_info WHERE ognz_id=?", Integer.class, first))
                        .isEqualTo(1);
                assertThat(jdbc.queryForObject("SELECT ognz_nm FROM tb_ognz_info WHERE ognz_id=?", String.class, first))
                        .isEqualTo(renamed);
                assertThat(jdbc.queryForObject("SELECT ognz_expln FROM tb_ognz_info WHERE ognz_id=?", String.class, first))
                        .isEqualTo("updated description");
            } finally { release.countDown(); }
        }
    }

    private DeptManageDto move(String id, String parent) {
        return DeptManageDto.builder().ognzId(id).upOgnzId(parent).sortOrdr(1).build();
    }

    private String parentOf(String id) {
        return jdbc.queryForObject("SELECT up_ognz_id FROM tb_ognz_info WHERE ognz_id=?", String.class, id);
    }

    private void authenticate() {
        var principal = CustomUserDetails.builder().userId(fixture).esntlId(fixture).enabled(true)
                .permissions(List.of("DEPT_UPDATE")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private void waitForDatabaseLock(String application) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        int waiting;
        do {
            waiting = jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() "
                    + "AND application_name=? AND wait_event_type='Lock'", Integer.class, application);
            if (waiting == 0) Thread.sleep(20);
        } while (waiting == 0 && System.nanoTime() < deadline);
        assertThat(waiting).as("선행 계층 변경의 PostgreSQL 행 잠금 대기").isEqualTo(1);
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(25, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        }
    }
}
