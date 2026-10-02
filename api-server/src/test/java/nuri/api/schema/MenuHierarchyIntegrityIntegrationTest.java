package nuri.api.schema;

import jakarta.persistence.EntityManager;
import nuri.business.domain.menu.Menu;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.service.auth.AuthorizationAdministrationService;
import nuri.business.service.auth.dto.AuthorizationDto.Grant;
import nuri.business.service.auth.dto.AuthorizationDto.ReplaceGrants;
import nuri.business.service.menu.MenuService;
import nuri.business.service.menu.dto.MenuDto;
import nuri.business.service.menu.dto.MenuStructureDto.MenuCreation;
import nuri.business.service.menu.dto.MenuStructureDto.MenuGroupGrantChange;
import nuri.business.service.menu.dto.MenuStructureDto.MenuPlacement;
import nuri.business.service.menu.dto.MenuStructureDto.MenuProperties;
import nuri.business.service.menu.dto.MenuStructureDto.MenuStructureSave;
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
        for (String group : ownGroups) {
            jdbc.update("DELETE FROM tb_authrt_chg_hstry WHERE authrt_cd=?", group);
            jdbc.update("DELETE FROM tb_authrt_user_map WHERE authrt_cd=?", group);
            jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd=?", group);
            jdbc.update("DELETE FROM tb_authrt_info WHERE authrt_cd=?", group);
        }
        for (String user : ownUsers) {
            jdbc.update("DELETE FROM tb_authrt_chg_hstry WHERE chg_user_idntfr=? OR scrty_dcsn_trgt_id=?", user, user);
            jdbc.update("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id=?", user);
            jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", user);
        }
        // 구조 저장이 만든 메뉴(이름이 fixtureId 로 시작)와 그 메뉴 표시도 함께 지운다. 한 문장으로 지워 자기 FK(지연 검사)를 지킨다.
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION' AND authrt_grnt_cd IN "
                + "(SELECT menu_sn::text FROM tb_menu_info WHERE menu_sn IN (?,?,?,?) OR menu_nm LIKE ?)",
                id(0), id(1), id(2), id(3), fixtureId + "%");
        jdbc.update("DELETE FROM tb_menu_info WHERE menu_sn IN (?,?,?,?) OR menu_nm LIKE ?",
                id(0), id(1), id(2), id(3), fixtureId + "%");
        ownPrograms.forEach(program -> jdbc.update("DELETE FROM tb_prgrm_lst WHERE prgrm_file_nm=?", program));
        ownPrograms.clear();
        ownMenus.clear();
        ownGroups.clear();
        ownUsers.clear();
    }

    // ── [2026-10-02 D2] 메뉴 구조 저장 ───────────────────────────────────────────────────────────

    private final List<String> ownGroups = new ArrayList<>();
    private final List<String> ownUsers = new ArrayList<>();
    @Autowired private AuthorizationAdministrationService administration;

    @Test
    @DisplayName("같은 구조 버전으로 동시에 저장하면 하나만 커밋되고 뒤 요청은 잠금을 기다린 뒤 409 로 거부된다")
    void concurrentStructureSavesWithTheSameVersionCannotBothCommit() throws Exception {
        String version = service.getMenuStructure().version();
        var contender = new AtomicReference<Future<CommonErrorCode>>();
        String applicationName = fixtureId + "-structure";
        var transaction = new TransactionTemplate(transactionManager);

        try (var executor = Executors.newSingleThreadExecutor()) {
            transaction.executeWithoutResult(status -> {
                service.saveMenuStructure(placements(version, new MenuPlacement(ref(1), ref(0), 1)));
                Integer blockerPid = jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
                contender.set(executor.submit(() -> {
                    authenticate();
                    try {
                        transaction.executeWithoutResult(other -> {
                            jdbc.queryForObject("SELECT set_config('application_name',?,true)", String.class, applicationName);
                            service.saveMenuStructure(placements(version, new MenuPlacement(ref(2), ref(0), 1)));
                        });
                        return null;
                    } catch (BusinessException rejected) {
                        return (CommonErrorCode) rejected.getErrorCode();
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                }));
                awaitRealMenuLock(applicationName, blockerPid, contender.get());
            });
            assertThat(contender.get().get(10, TimeUnit.SECONDS)).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        }

        assertThat(parent(id(1))).isEqualTo(id(0));
        assertThat(parent(id(2))).as("거부된 저장은 아무것도 남기지 않는다").isNull();
        String fresh = service.getMenuStructure().version();
        assertThat(fresh).isNotEqualTo(version);
        var saved = service.saveMenuStructure(placements(fresh, new MenuPlacement(ref(2), ref(0), 2)));
        assertThat(parent(id(2))).isEqualTo(id(0));
        assertThat(saved.version()).isEqualTo(service.getMenuStructure().version());
    }

    @Test
    @DisplayName("메뉴 이동과 그룹 표시를 함께 저장하는 동안 같은 그룹의 권한 저장은 기다리고, 옛 버전이면 409 다")
    void structureSaveWithGrantsSerializesConcurrentGroupGrantSaves() throws Exception {
        String actor = seedActor("AUTHRT_GRANT", "AUTHRT_READ", "MENU_UPDATE", "MENU_READ");
        String group = seedGroup("T");
        jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,'NAVIGATION',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", group, ref(1));
        authenticateActor(actor, "AUTHRT_GRANT", "AUTHRT_READ", "MENU_UPDATE", "MENU_READ");
        var before = administration.group(group);
        String version = service.getMenuStructure().version();

        // 그룹이 새 상위의 표시 없이 옮긴 메뉴만 보면 사이드바에서 숨겨지므로 거부된다.
        assertThatThrownBy(() -> service.saveMenuStructure(placements(version, new MenuPlacement(ref(1), ref(0), 1))))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("그룹에서 상위 메뉴");
        assertThat(parent(id(1))).isNull();

        var contender = new AtomicReference<Future<CommonErrorCode>>();
        String applicationName = fixtureId + "-grants";
        var transaction = new TransactionTemplate(transactionManager);
        var request = new MenuStructureSave(version, List.of(), List.of(new MenuPlacement(ref(1), ref(0), 1)), List.of(), List.of(),
                List.of(new MenuGroupGrantChange(group, before.version(), List.of(ref(0)), List.of(), List.of())));
        try (var executor = Executors.newSingleThreadExecutor()) {
            transaction.executeWithoutResult(status -> {
                service.saveMenuStructure(request);
                Integer blockerPid = jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
                contender.set(executor.submit(() -> {
                    authenticateActor(actor, "AUTHRT_GRANT", "AUTHRT_READ", "MENU_UPDATE", "MENU_READ");
                    try {
                        transaction.executeWithoutResult(other -> {
                            jdbc.queryForObject("SELECT set_config('application_name',?,true)", String.class, applicationName);
                            administration.replaceGrants(group, new ReplaceGrants(before.grants(), before.version(), true));
                        });
                        return null;
                    } catch (BusinessException rejected) {
                        return (CommonErrorCode) rejected.getErrorCode();
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                }));
                awaitRealMenuLock(applicationName, blockerPid, contender.get());
            });
            assertThat(contender.get().get(10, TimeUnit.SECONDS)).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        }
        assertThat(parent(id(1))).isEqualTo(id(0));
        assertThat(administration.group(group).grants()).containsExactlyInAnyOrder(
                new Grant("NAVIGATION", ref(0)), new Grant("NAVIGATION", ref(1)));
        assertThat(jdbc.queryForObject("SELECT count(DISTINCT dmnd_idntfr) FROM tb_authrt_chg_hstry WHERE authrt_cd=? AND chg_user_idntfr=?",
                Long.class, group, actor)).isEqualTo(1);
        // 옛 그룹 버전으로 다시 저장하면 메뉴를 바꾸기 전에 거부되고 메뉴도 그대로다.
        String after = service.getMenuStructure().version();
        assertThatThrownBy(() -> service.saveMenuStructure(new MenuStructureSave(after, List.of(), List.of(new MenuPlacement(ref(2), ref(0), 2)),
                List.of(), List.of(), List.of(new MenuGroupGrantChange(group, before.version(), List.of(ref(2)), List.of(), List.of())))))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(parent(id(2))).isNull();
    }

    @Test
    @DisplayName("새 메뉴는 실제 번호로 저장되고 그 아래로 옮긴 메뉴·호환 관리자 표시가 함께 반영되며, 3단계를 넘으면 전부 되돌린다")
    void structureSaveCreatesMovesAndDeletesWithRealIdentifiers() {
        String actor = seedActor("MENU_CREATE", "MENU_DELETE", "MENU_UPDATE", "MENU_READ");
        authenticateActor(actor, "MENU_CREATE", "MENU_DELETE", "MENU_UPDATE", "MENU_READ");
        var created = service.saveMenuStructure(new MenuStructureSave(service.getMenuStructure().version(),
                List.of(new MenuCreation("new-1", fixtureId + "-root", null, null, "Y"),
                        new MenuCreation("new-2", fixtureId + "-child", "/admin/structure-test", "구조 저장 시험", "N")),
                List.of(new MenuPlacement("new-2", "new-1", 1), new MenuPlacement("new-1", null, 99),
                        new MenuPlacement(ref(3), "new-2", 1)),
                List.of(new MenuProperties(id(0), fixtureId + "-renamed", "", "설명", "N")), List.of(), List.of()));
        Long root = jdbc.queryForObject("SELECT menu_sn FROM tb_menu_info WHERE menu_nm=?", Long.class, fixtureId + "-root");
        Long child = jdbc.queryForObject("SELECT menu_sn FROM tb_menu_info WHERE menu_nm=?", Long.class, fixtureId + "-child");
        assertThat(parent(child)).isEqualTo(root);
        assertThat(parent(id(3))).isEqualTo(child);
        assertThat(menuRow(child)).containsEntry("use_yn", "N").containsEntry("modern_route", "/admin/structure-test")
                .containsEntry("menu_expln", "구조 저장 시험").containsEntry("menu_ordr", 1);
        assertThat(menuRow(root)).containsEntry("menu_ordr", 99).containsEntry("modern_route", null);
        assertThat(menuRow(id(0))).containsEntry("menu_nm", fixtureId + "-renamed").containsEntry("modern_route", null)
                .containsEntry("use_yn", "N").containsEntry("up_menu_sn", null);
        assertThat(created.menus()).anySatisfy(item -> assertThat(item.menuNo()).isEqualTo(child));
        assertThat(created.version()).isEqualTo(service.getMenuStructure().version());
        // 새 메뉴는 단건 등록과 같이 호환 관리자 그룹에 메뉴 표시가 붙는다(상위가 먼저 붙어야 하위도 붙는다).
        assertThat(jdbc.queryForList("SELECT authrt_grnt_cd FROM tb_authrt_grnt_map WHERE authrt_cd='ROLE_ADMIN' "
                + "AND authrt_type_cd='NAVIGATION' AND authrt_grnt_cd IN (?,?)", String.class, root.toString(), child.toString()))
                .containsExactlyInAnyOrder(root.toString(), child.toString());

        // id(3) 는 이미 3단계다. 그 아래로 다른 메뉴를 넣으면 4단계가 되어 메뉴 변경 전체가 되돌아간다.
        String current = created.version();
        assertThatThrownBy(() -> service.saveMenuStructure(new MenuStructureSave(current, List.of(),
                List.of(new MenuPlacement(ref(2), ref(3), 1), new MenuPlacement(ref(1), null, 5)),
                List.of(), List.of(), List.of())))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("3단계까지만");
        assertThat(parent(id(2))).isNull();
        assertThat(menuRow(id(1))).containsEntry("menu_ordr", 1);

        // 하위를 빼낸 뒤 새 메뉴 둘을 한 번에 지우면 그 메뉴 표시도 함께 회수된다.
        service.saveMenuStructure(new MenuStructureSave(current, List.of(), List.of(new MenuPlacement(ref(3), null, 4)),
                List.of(), List.of(child, root), List.of()));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_menu_info WHERE menu_sn IN (?,?)", Long.class, root, child)).isZero();
        assertThat(parent(id(3))).isNull();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_type_cd='NAVIGATION' AND authrt_grnt_cd IN (?,?)",
                Long.class, root.toString(), child.toString())).isZero();
    }

    @Test
    @DisplayName("상위 삭제가 잠금을 기다리는 사이 다른 저장이 그 아래 새 메뉴를 커밋하면 삭제는 409 이고 새 메뉴는 남는다")
    void deletionWaitingForTheLockDoesNotCascadeIntoAMenuCommittedMeanwhile() throws Exception {
        String actor = seedActor("MENU_CREATE", "MENU_DELETE", "MENU_UPDATE", "MENU_READ");
        authenticateActor(actor, "MENU_CREATE", "MENU_DELETE", "MENU_UPDATE", "MENU_READ");
        String version = service.getMenuStructure().version();
        var contender = new AtomicReference<Future<CommonErrorCode>>();
        String applicationName = fixtureId + "-cascade";
        var transaction = new TransactionTemplate(transactionManager);

        try (var executor = Executors.newSingleThreadExecutor()) {
            transaction.executeWithoutResult(status -> {
                service.saveMenuStructure(new MenuStructureSave(version, List.of(new MenuCreation("new-1", fixtureId + "-late", null, null, "Y")),
                        List.of(new MenuPlacement("new-1", ref(0), 1)), List.of(), List.of(), List.of()));
                Integer blockerPid = jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class);
                contender.set(executor.submit(() -> {
                    authenticateActor(actor, "MENU_CREATE", "MENU_DELETE", "MENU_UPDATE", "MENU_READ");
                    try {
                        transaction.executeWithoutResult(other -> {
                            jdbc.queryForObject("SELECT set_config('application_name',?,true)", String.class, applicationName);
                            service.saveMenuStructure(new MenuStructureSave(version, List.of(), List.of(), List.of(),
                                    List.of(id(0)), List.of()));
                        });
                        return null;
                    } catch (BusinessException rejected) {
                        return (CommonErrorCode) rejected.getErrorCode();
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                }));
                awaitRealMenuLock(applicationName, blockerPid, contender.get());
            });
            CommonErrorCode outcome = contender.get().get(10, TimeUnit.SECONDS);
            assertThat(jdbc.queryForList("SELECT up_menu_sn FROM tb_menu_info WHERE menu_nm=?", Long.class, fixtureId + "-late"))
                    .as("잠금을 기다리는 사이 커밋된 하위가 상위와 함께 조용히 지워지면 안 된다").containsExactly(id(0));
            assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_menu_info WHERE menu_sn=?", Long.class, id(0))).isOne();
            assertThat(outcome).isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        }
    }

    @Test
    @DisplayName("새 폴더를 만들고 관리자 그룹이 보던 메뉴를 그 아래로 옮기면, 호환 배정으로 폴더가 보이므로 거부하지 않는다")
    void newFolderCountsItsCompatibilityAdminGrantInTheVisibilityCheck() {
        String actor = seedActor("MENU_CREATE", "MENU_UPDATE", "MENU_READ", "AUTHRT_GRANT", "AUTHRT_READ");
        jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES('ROLE_ADMIN','NAVIGATION',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", ref(1));
        // 메뉴 권한만 가진 관리자도 '새 폴더 만들고 옮기기' 를 한 번에 저장한다(그룹 권한 변경 없음).
        authenticateActor(actor, "MENU_CREATE", "MENU_UPDATE", "MENU_READ");
        service.saveMenuStructure(new MenuStructureSave(service.getMenuStructure().version(),
                List.of(new MenuCreation("new-1", fixtureId + "-folder", null, null, "Y")),
                List.of(new MenuPlacement("new-1", null, 98), new MenuPlacement(ref(1), "new-1", 1)), List.of(), List.of(), List.of()));
        Long folder = jdbc.queryForObject("SELECT menu_sn FROM tb_menu_info WHERE menu_nm=?", Long.class, fixtureId + "-folder");
        assertThat(parent(id(1))).isEqualTo(folder);
        assertThat(adminNavigation(folder, id(1))).containsExactlyInAnyOrder(folder.toString(), ref(1));

        // 관리자 그룹에 새 하위만 명시해도, 그 상위(새 폴더)는 호환 배정으로 함께 보이므로 거부하지 않는다.
        authenticateActor(actor, "MENU_CREATE", "MENU_UPDATE", "MENU_READ", "AUTHRT_GRANT", "AUTHRT_READ");
        String adminVersion = administration.group("ROLE_ADMIN").version();
        service.saveMenuStructure(new MenuStructureSave(service.getMenuStructure().version(),
                List.of(new MenuCreation("new-1", fixtureId + "-folder2", null, null, "Y"),
                        new MenuCreation("new-2", fixtureId + "-child2", null, null, "Y")),
                List.of(new MenuPlacement("new-1", null, 99), new MenuPlacement("new-2", "new-1", 1)), List.of(), List.of(),
                List.of(new MenuGroupGrantChange("ROLE_ADMIN", adminVersion, List.of("new-2"), List.of(), List.of()))));
        Long folder2 = jdbc.queryForObject("SELECT menu_sn FROM tb_menu_info WHERE menu_nm=?", Long.class, fixtureId + "-folder2");
        Long child2 = jdbc.queryForObject("SELECT menu_sn FROM tb_menu_info WHERE menu_nm=?", Long.class, fixtureId + "-child2");
        assertThat(adminNavigation(folder2, child2)).containsExactlyInAnyOrder(folder2.toString(), child2.toString());
    }

    @Test
    @DisplayName("라우트가 있던 메뉴의 라우트를 구조 저장으로 비우면 기동 때 라우트 보강이 다시 채우지 않는다")
    void clearedRouteStaysClearedAcrossStartupRouteMigration() throws Exception {
        String program = seedProgram("BoardManage");
        jdbc.update("UPDATE tb_menu_info SET prgrm_file_nm=?,modern_route='/admin/route-to-clear' WHERE menu_sn=?", program, id(0));
        service.saveMenuStructure(new MenuStructureSave(service.getMenuStructure().version(), List.of(), List.of(),
                List.of(new MenuProperties(id(0), fixtureId + "0", "", null, "Y")), List.of(), List.of()));
        assertThat(menuRow(id(0))).containsEntry("modern_route", "");

        runStartupRouteMigrationAfterSnapshot(() -> { });

        assertThat(menuRow(id(0))).as("비운 라우트가 연결 프로그램에서 다시 채워지면 안 된다").containsEntry("modern_route", "")
                .containsEntry("prgrm_file_nm", program);
    }

    private List<String> adminNavigation(Long... menus) {
        var ids = java.util.Arrays.stream(menus).map(String::valueOf).toList();
        return jdbc.queryForList("SELECT authrt_grnt_cd FROM tb_authrt_grnt_map WHERE authrt_cd='ROLE_ADMIN' AND authrt_type_cd='NAVIGATION'",
                String.class).stream().filter(ids::contains).toList();
    }

    private String seedActor(String... permissions) {
        String actor = fixtureId + "A";
        String group = seedGroup("G");
        jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,pswd,user_nm,user_stts_cd,lck_yn,sbscrb_ymd) "
                + "VALUES(?,?,'test-only-unusable',?,'P','N',to_char(CURRENT_DATE,'YYYYMMDD'))", actor, actor.toLowerCase(), actor);
        ownUsers.add(actor);
        jdbc.update("INSERT INTO tb_authrt_user_map(scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,?,'USR03',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", actor, group);
        for (String permission : permissions) {
            jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                    + "VALUES(?,'OPERATION',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", group, permission);
        }
        return actor;
    }

    private String seedGroup(String suffix) {
        String group = fixtureId + suffix;
        jdbc.update("INSERT INTO tb_authrt_info(authrt_cd,authrt_nm,authrt_crt_ymd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,?,to_char(CURRENT_DATE,'YYYYMMDD'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", group, group + " 그룹");
        ownGroups.add(group);
        return group;
    }

    private static void authenticateActor(String actor, String... permissions) {
        var principal = CustomUserDetails.builder().userId(actor.toLowerCase()).esntlId(actor)
                .enabled(true).permissions(List.of(permissions)).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    private String ref(int index) {
        return Long.toString(id(index));
    }

    private static MenuStructureSave placements(String version, MenuPlacement... placements) {
        return new MenuStructureSave(version, List.of(), List.of(placements), List.of(), List.of(), List.of());
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
