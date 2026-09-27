package nuri.api.schema;

import jakarta.persistence.EntityManager;
import nuri.business.domain.menu.Menu;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.service.menu.MenuService;
import nuri.business.service.menu.dto.MenuDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.AopTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mockingDetails;

/** 최종 메뉴 그래프와 동시 parent 변경을 실제 PostgreSQL 행 잠금으로 검증한다. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class MenuHierarchyIntegrityIntegrationTest {

    @Autowired private MenuService service;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager entityManager;
    @Autowired private PlatformTransactionManager transactionManager;
    @MockitoSpyBean private MenuRepository menuRepository;

    private String fixtureId;
    private final List<Long> ownMenus = new ArrayList<>();
    private final List<String> ownPrograms = new ArrayList<>();

    @BeforeEach
    void seedOnlyDisposableDatabaseMenus() {
        fixtureId = "MH" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        for (int index = 0; index < 4; index++) {
            ownMenus.add(jdbc.queryForObject("INSERT INTO tb_menu_info(menu_nm,menu_ordr,use_yn,frst_rgtr_id,last_mdfr_id) "
                    + "VALUES (?,1,'Y',?,?) RETURNING menu_sn", Long.class, fixtureId + index, fixtureId, fixtureId));
        }
        authenticate();
    }

    @AfterEach
    void removeOnlyOwnFixtures() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_menu_info WHERE menu_sn IN (?,?,?,?)", ownMenus.toArray());
        ownPrograms.forEach(program -> jdbc.update("DELETE FROM tb_prgrm_lst WHERE prgrm_file_nm=?", program));
        ownPrograms.clear();
        ownMenus.clear();
    }

    @Test
    @DisplayName("3개 노드 순환을 거부하고 부모·순서·감사필드를 모두 보존한다")
    void rejectsThreeNodeCycleWithoutCommittingAnyChanges() {
        var original = jdbc.queryForList("SELECT * FROM tb_menu_info WHERE menu_sn IN (?,?,?,?) ORDER BY menu_sn",
                ownMenus.toArray());

        assertThatThrownBy(() -> service.updateMenuOrders(List.of(
                order(id(0), id(1)), order(id(1), id(2)), order(id(2), id(0)))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);

        assertThat(jdbc.queryForList("SELECT * FROM tb_menu_info WHERE menu_sn IN (?,?,?,?) ORDER BY menu_sn",
                ownMenus.toArray())).isEqualTo(original);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    @DisplayName("중간 상태가 순환이어도 최종 그래프가 정상이면 배치 순서와 무관하게 커밋한다")
    void commitsValidFinalGraphInEitherBatchOrder(boolean reverse) {
        jdbc.update("UPDATE tb_menu_info SET up_menu_sn=? WHERE menu_sn=?", id(0), id(1));
        var changes = new ArrayList<>(List.of(order(id(0), id(1)), order(id(1), null)));
        if (reverse) Collections.reverse(changes);

        service.updateMenuOrders(changes);

        assertThat(parent(id(0))).isEqualTo(id(1));
        assertThat(parent(id(1))).isNull();
    }

    @Test
    @DisplayName("다른 영역의 기존 순환이 정상 이동을 막지 않고 순환을 끊는 수정도 허용한다")
    void allowsUnrelatedMoveAndRepairOfExistingCycle() {
        jdbc.update("UPDATE tb_menu_info SET up_menu_sn=? WHERE menu_sn=?", id(1), id(0));
        jdbc.update("UPDATE tb_menu_info SET up_menu_sn=? WHERE menu_sn=?", id(0), id(1));

        service.updateMenuManage(order(id(2), id(3)));
        service.updateMenuManage(order(id(0), null));

        assertThat(parent(id(2))).isEqualTo(id(3));
        assertThat(parent(id(0))).isNull();
        assertThat(parent(id(1))).isEqualTo(id(0));
    }

    @Test
    @DisplayName("반대 방향 동시 이동은 실제 행 잠금에서 직렬화되고 뒤 요청이 최신 그래프의 순환을 거부한다")
    void concurrentOpposingMovesCannotBothCommit() throws Exception {
        var contender = new AtomicReference<Future<CommonErrorCode>>();
        String applicationName = fixtureId + "-contender";
        var transaction = new TransactionTemplate(transactionManager);

        try (var executor = Executors.newSingleThreadExecutor()) {
            transaction.executeWithoutResult(status -> {
                service.updateMenuManage(order(id(0), id(1)));
                entityManager.flush();
                Integer blockerPid = jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
                contender.set(executor.submit(() -> {
                    authenticate();
                    try {
                        transaction.executeWithoutResult(other -> {
                            jdbc.queryForObject("SELECT set_config('application_name',?,true)", String.class, applicationName);
                            service.updateMenuManage(order(id(1), id(0)));
                        });
                        return null;
                    } catch (BusinessException rejected) {
                        assertThat(rejected.getErrorCode()).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
                        return CommonErrorCode.INVALID_INPUT_VALUE;
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                }));

                awaitRealMenuLock(applicationName, blockerPid, contender.get());
            });

            assertThat(contender.get().get(10, TimeUnit.SECONDS)).isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        }

        assertThat(parent(id(0))).isEqualTo(id(1));
        assertThat(parent(id(1))).isNull();
    }

    @Test
    @DisplayName("시작 시 라우트 보강은 오래된 메뉴 부모를 저장해 정상 계층을 순환으로 되돌리지 않는다")
    void startupRouteMigrationDoesNotRestoreStaleParentAfterHierarchyMove() throws Exception {
        String program = seedProgram("BoardManage");
        jdbc.update("UPDATE tb_menu_info SET prgrm_file_nm=?,up_menu_sn=? WHERE menu_sn=?", program, id(1), id(0));

        runStartupRouteMigrationAfterSnapshot(() -> {
            service.updateMenuOrders(List.of(order(id(0), null), order(id(1), id(0))));
            service.updateMenuManage(MenuDto.builder().menuNo(id(0)).prgrmFileNm(program)
                    .menuNm(fixtureId + "edited").menuOrdr(7).build());
            assertThat(parent(id(0))).isNull();
            assertThat(parent(id(1))).isEqualTo(id(0));
        });

        assertThat(parent(id(0))).as("라우트 보강이 이미 커밋된 부모 변경을 되돌리면 안 된다").isNull();
        assertThat(parent(id(1))).isEqualTo(id(0));
        Map<String, Object> updated = menuRow(id(0));
        assertThat(updated).containsEntry("modern_route", "/admin/community/boards")
                .containsEntry("menu_nm", fixtureId + "edited").containsEntry("menu_ordr", 7)
                .containsEntry("prgrm_file_nm", program).containsEntry("frst_rgtr_id", fixtureId)
                .containsEntry("last_mdfr_id", "SYSTEM");
        assertThat(updated.get("mdfcn_dt")).isNotNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "/admin/explicit-route"})
    @DisplayName("시작 시 라우트 보강은 조회 후 저장된 명시 경로나 빈 문자열을 덮어쓰지 않는다")
    void startupRouteMigrationPreservesConcurrentExplicitOrEmptyRoute(String route) throws Exception {
        String program = seedProgram("BoardManage");
        jdbc.update("UPDATE tb_menu_info SET prgrm_file_nm=? WHERE menu_sn=?", program, id(0));
        var committed = new AtomicReference<Map<String, Object>>();

        runStartupRouteMigrationAfterSnapshot(() -> {
            service.updateMenuManage(MenuDto.builder().menuNo(id(0)).prgrmFileNm(program)
                    .menuNm(fixtureId + "edited").menuOrdr(9).upMenuSn(id(1)).modernRoute(route).build());
            committed.set(menuRow(id(0)));
        });

        assertThat(menuRow(id(0))).as("관리자가 저장한 경로·내용·감사필드를 모두 보존한다")
                .isEqualTo(committed.get());
        assertThat(menuRow(id(0))).containsEntry("modern_route", route);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    @DisplayName("시작 시 라우트 보강은 프로그램 연결 변경·해제 후 이전 프로그램의 경로를 넣지 않는다")
    void startupRouteMigrationPreservesConcurrentProgramChange(boolean unlink) throws Exception {
        String originalProgram = seedProgram("BoardManage");
        String replacementProgram = unlink ? null : seedProgram("MenuList");
        jdbc.update("UPDATE tb_menu_info SET prgrm_file_nm=? WHERE menu_sn=?", originalProgram, id(0));
        var committed = new AtomicReference<Map<String, Object>>();

        runStartupRouteMigrationAfterSnapshot(() -> {
            service.updateMenuManage(MenuDto.builder().menuNo(id(0)).prgrmFileNm(replacementProgram)
                    .menuNm(fixtureId + "edited").menuOrdr(9).upMenuSn(id(1)).build());
            committed.set(menuRow(id(0)));
        });

        assertThat(menuRow(id(0))).as("새 프로그램 연결과 감사필드를 보존하며 과거 경로를 보강하지 않는다")
                .isEqualTo(committed.get());
        assertThat(menuRow(id(0))).containsEntry("prgrm_file_nm", replacementProgram)
                .containsEntry("modern_route", null);
    }

    private String seedProgram(String name) {
        String program = fixtureId + name;
        jdbc.update("INSERT INTO tb_prgrm_lst(prgrm_file_nm,url) VALUES (?,?)", program, "/admin/community/boards");
        ownPrograms.add(program);
        return program;
    }

    private Map<String, Object> menuRow(long menuId) {
        return jdbc.queryForMap("SELECT * FROM tb_menu_info WHERE menu_sn=?", menuId);
    }

    private void runStartupRouteMigrationAfterSnapshot(Runnable concurrentWrite) throws Exception {
        var snapshotRead = new CountDownLatch(1);
        var continueMigration = new CountDownLatch(1);
        // Spring spies JDK repository proxies with a delegating default answer. The query method
        // is abstract, so invocation.callRealMethod() would never reach the real Spring Data query.
        var repositoryDelegate = mockingDetails(menuRepository).getMockCreationSettings().getDefaultAnswer();
        doAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            List<Menu> snapshot = (List<Menu>) repositoryDelegate.answer(invocation);
            // Keep the real database snapshot, but restrict this startup rehearsal to its own fixtures.
            List<Menu> ownSnapshot = snapshot.stream().filter(menu -> ownMenus.contains(menu.getMenuSn())).toList();
            snapshotRead.countDown();
            if (!continueMigration.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Menu route migration barrier was not released");
            }
            return ownSnapshot;
        }).when(menuRepository).findAllWithoutModernRoute();

        try (var executor = Executors.newSingleThreadExecutor()) {
            // @PostConstruct runs on the target before the service transaction proxy is available.
            MenuService startupTarget = AopTestUtils.getUltimateTargetObject(service);
            Future<?> migration = executor.submit(startupTarget::migrateModernRoutes);
            try {
                assertThat(snapshotRead.await(5, TimeUnit.SECONDS)).as("실제 메뉴 조회 후의 경합 지점").isTrue();
                concurrentWrite.run();
            } finally {
                continueMigration.countDown();
                // Surface worker failures even when the snapshot barrier was never reached.
                migration.get(10, TimeUnit.SECONDS);
            }
        }

    }

    private void awaitRealMenuLock(String applicationName, Integer blockerPid, Future<?> contender) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        boolean blocked = false;
        while (System.nanoTime() < deadline && !contender.isDone()) {
            // PostgreSQL keeps the first pg_stat_activity snapshot for this blocker transaction.
            // Refresh it so a contender that starts after the first poll can be observed.
            jdbc.execute("SELECT pg_stat_clear_snapshot()");
            Boolean observed = jdbc.queryForObject("""
                    SELECT EXISTS (
                        SELECT 1 FROM pg_stat_activity
                        WHERE application_name=? AND wait_event_type='Lock'
                          AND ?=ANY(pg_blocking_pids(pid)))
                    """, Boolean.class, applicationName, blockerPid);
            if (Boolean.TRUE.equals(observed)) {
                blocked = true;
                break;
            }
            java.util.concurrent.locks.LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(20));
        }
        assertThat(blocked).as("두 번째 메뉴 변경이 첫 트랜잭션의 실제 행 잠금에서 대기해야 한다").isTrue();
    }

    private void authenticate() {
        var principal = CustomUserDetails.builder().userId(fixtureId).esntlId(fixtureId)
                .enabled(true).permissions(List.of("MENU_UPDATE")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private long id(int index) {
        return ownMenus.get(index);
    }

    private Long parent(long id) {
        return jdbc.queryForObject("SELECT up_menu_sn FROM tb_menu_info WHERE menu_sn=?", Long.class, id);
    }

    private static MenuDto order(long id, Long parent) {
        return MenuDto.builder().menuNo(id).upMenuSn(parent).menuOrdr(2).build();
    }
}
