package nuri.api.schema;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.LockSupport;
import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.business.security.authorization.PermissionCodes;
import nuri.business.service.menu.MenuBookmarkService;
import nuri.business.service.menu.dto.MenuBookmarkCleanupRequest;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Real PostgreSQL owner locks protect the quota and explicit cleanup without widening owner access. */
@Tag("schema-validation")
@SpringBootTest
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class MenuBookmarkConcurrencyIntegrationTest {
    @Autowired private MenuBookmarkService service;
    @Autowired private AuthorizationSnapshotService authorizationSnapshots;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    private String owner;
    private String ownerLogin;
    private String otherOwner;
    private String group;
    private String replacementGroup;
    private final List<Long> menus = new ArrayList<>();

    @BeforeEach
    void seedDisposableFixtures() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        owner = "BM" + suffix;
        ownerLogin = "login-" + suffix;
        otherOwner = "BO" + suffix;
        group = owner + "G";
        replacementGroup = owner + "H";
        seedUser(owner, ownerLogin);
        seedUser(otherOwner, "other-" + suffix);
        seedGroup(group);
        seedGroup(replacementGroup);
        jdbc.update("INSERT INTO tb_authrt_user_map(scrty_dcsn_trgt_id,authrt_cd,mbr_type_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,?,'USR03',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", owner, group);
        for (int index = 0; index < 31; index++) {
            Long menu = jdbc.queryForObject("INSERT INTO tb_menu_info(menu_nm,menu_ordr,use_yn) VALUES('bookmark fixture',?,'Y') RETURNING menu_sn", Long.class, index);
            menus.add(menu);
            grantNavigation(menu);
            if (index < 29) seedBookmark(owner, menu);
        }
        authenticate();
    }

    private void seedUser(String esntlId, String loginId) {
        jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd) "
                + "VALUES(?,?,'bookmark fixture','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))", esntlId, loginId);
    }

    private void seedGroup(String groupCode) {
        jdbc.update("INSERT INTO tb_authrt_info(authrt_cd,authrt_nm,authrt_crt_ymd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,'bookmark fixture',to_char(CURRENT_DATE,'YYYYMMDD'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", groupCode);
    }

    private void grantNavigation(Long menu) {
        jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,'NAVIGATION',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", group, menu.toString());
    }

    private void seedBookmark(String esntlId, Long menu) {
        jdbc.update("INSERT INTO tb_bkmk_menu_mng_rslt(menu_id,user_id,menu_nm) VALUES(?,?,'bookmark fixture')", menu, esntlId);
    }

    @AfterEach
    void cleanDisposableFixtures() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_bkmk_menu_mng_rslt WHERE user_id IN (?,?)", owner, otherOwner);
        jdbc.update("DELETE FROM tb_authrt_user_map WHERE scrty_dcsn_trgt_id IN (?,?)", owner, otherOwner);
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd IN (?,?)", group, replacementGroup);
        jdbc.update("DELETE FROM tb_authrt_info WHERE authrt_cd IN (?,?)", group, replacementGroup);
        for (Long menu : menus) jdbc.update("DELETE FROM tb_menu_info WHERE menu_sn=?", menu);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id IN (?,?)", owner, otherOwner);
    }

    @Test
    void differentSimultaneousAddsCannotExceedThirty() throws Exception {
        concurrentAdds(false);
    }

    @Test
    void sameSimultaneousAddRemainsIdempotentAtTheLimit() throws Exception {
        concurrentAdds(true);
    }

    @Test
    void unavailableBookmarksStayStoredAndBecomeVisibleAgain() {
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd=? AND authrt_type_cd='NAVIGATION' AND authrt_grnt_cd=?",
                group, menus.get(0).toString());
        setUse(1, "N");
        authenticate();

        var hidden = service.getMyBookmarkStatus(owner);
        assertThat(hidden.unavailableCount()).isEqualTo(2);
        assertThat(hidden.bookmarks()).hasSize(27).extracting(bookmark -> bookmark.menuNo())
                .doesNotContain(menus.get(0), menus.get(1));
        assertThat(storedMenus(owner)).containsExactlyElementsOf(menus.subList(0, 29));

        grantNavigation(menus.get(0));
        setUse(1, "Y");
        authenticate();
        assertThat(service.getMyBookmarkStatus(owner).unavailableCount()).isZero();
        assertThat(service.getMyBookmarks(owner)).hasSize(29).extracting(bookmark -> bookmark.menuNo())
                .contains(menus.get(0), menus.get(1));
        assertThat(storedMenus(owner)).containsExactlyElementsOf(menus.subList(0, 29));
    }

    @Test
    void explicitCleanupRemovesOnlyOwnerHiddenAndConfirmedVisibleRows() {
        setUse(0, "N");
        seedBookmark(otherOwner, menus.get(0));
        seedBookmark(otherOwner, menus.get(1));
        seedBookmark(otherOwner, menus.get(2));
        var request = request(1, List.of(menus.get(1)));

        assertThat(service.cleanupUnavailableBookmarks(owner, request).removedCount()).isEqualTo(2);
        assertThat(storedMenus(owner)).containsExactlyElementsOf(menus.subList(2, 29));
        assertThat(storedMenus(otherOwner)).containsExactlyElementsOf(menus.subList(0, 3));
        assertThat(service.getMyBookmarkStatus(owner).unavailableCount()).isZero();
        assertThat(service.getMyBookmarks(owner)).hasSize(27);

        // The stale confirmation is not silently reinterpreted as a new cleanup.
        assertConflictWithoutMutation(request);
        service.addBookmark(owner, menus.get(29));
        service.addBookmark(owner, menus.get(30));
        assertThat(storedMenus(owner)).hasSize(29).contains(menus.get(29), menus.get(30));
    }

    @Test
    void hiddenRowsConsumeQuotaUntilTheOwnerExplicitlyCleansThemUp() {
        service.addBookmark(owner, menus.get(29));
        setUse(0, "N");
        assertThat(service.getMyBookmarkStatus(owner).unavailableCount()).isEqualTo(1);
        assertThatThrownBy(() -> service.addBookmark(owner, menus.get(30))).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
        assertThat(storedMenus(owner)).hasSize(30).contains(menus.get(0));

        assertThat(service.cleanupUnavailableBookmarks(owner, request(1, List.of())).removedCount()).isEqualTo(1);
        service.addBookmark(owner, menus.get(30));
        assertThat(storedMenus(owner)).hasSize(30).contains(menus.get(30)).doesNotContain(menus.get(0));
    }

    @Test
    void strictSelfRejectsOtherOwnerEvenForAnAdministrator() {
        seedBookmark(otherOwner, menus.get(0));
        var administrator = CustomUserDetails.builder().userId(ownerLogin).esntlId(owner).enabled(true).lockAt("N")
                .groups(List.of("ROLE_ADMIN")).permissions(List.copyOf(PermissionCodes.ALL))
                .authorizationVersion(authorizationSnapshots.load(owner).authorizationVersion()).build();
        authenticate(administrator);
        var otherRequest = new MenuBookmarkCleanupRequest(authorizationSnapshots.load(otherOwner).authorizationVersion(), 1, List.of());

        assertThatThrownBy(() -> service.getMyBookmarkStatus(otherOwner)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> service.cleanupUnavailableBookmarks(otherOwner, otherRequest)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> service.cleanupUnavailableBookmarks(ownerLogin, request(0, List.of())))
                .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThat(storedMenus(owner)).containsExactlyElementsOf(menus.subList(0, 29));
        assertThat(storedMenus(otherOwner)).containsExactly(menus.get(0));
    }

    @Test
    void staleCountAndUnownedOrNowHiddenUiCandidatesDoNotDeleteAnything() {
        setUse(0, "N");
        seedBookmark(otherOwner, menus.get(30));
        assertConflictWithoutMutation(request(0, List.of()));
        assertConflictWithoutMutation(request(1, List.of(menus.get(0))));
        assertConflictWithoutMutation(request(1, List.of(menus.get(30))));
        assertThat(storedMenus(otherOwner)).containsExactly(menus.get(30));

        var removedCandidate = request(1, List.of(menus.get(1)));
        service.removeBookmark(owner, menus.get(1));
        assertConflictWithoutMutation(removedCandidate);
        assertThat(storedMenus(owner)).hasSize(28).contains(menus.get(0));
    }

    @Test
    void freshMembershipGroupsDriveCleanupEvenWhenPrincipalStillHasOldGroups() {
        var stalePrincipal = principal(authorizationSnapshots.load(owner));
        jdbc.update("UPDATE tb_authrt_user_map SET authrt_cd=? WHERE scrty_dcsn_trgt_id=? AND authrt_cd=?",
                replacementGroup, owner, group);
        var current = authorizationSnapshots.load(owner);
        assertThat(current.groups()).containsExactly(replacementGroup);
        assertThat(current.authorizationVersion()).isNotEqualTo(stalePrincipal.getAuthorizationVersion());
        authenticate(stalePrincipal);

        assertThat(service.cleanupUnavailableBookmarks(owner,
                new MenuBookmarkCleanupRequest(current.authorizationVersion(), 29, List.of())).removedCount()).isEqualTo(29);
        assertThat(storedMenus(owner)).isEmpty();
    }

    @Test
    void cleanupReloadsAuthorizationAfterWaitingForTheOwnerLock() throws Exception {
        var initial = authorizationSnapshots.load(owner);
        var stalePrincipal = principal(initial);
        var request = new MenuBookmarkCleanupRequest(initial.authorizationVersion(), 0, List.of(menus.get(0)));
        var ownerLocked = new CountDownLatch(1);
        var releaseOwner = new CountDownLatch(1);
        var holderPid = new AtomicInteger();
        var cleanupPid = new AtomicInteger();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var holder = executor.submit(() -> new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                holderPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                jdbc.queryForObject("SELECT esntl_id FROM tb_user_info WHERE esntl_id=? FOR UPDATE", String.class, owner);
                ownerLocked.countDown();
                awaitFixtureRelease(releaseOwner);
            }));
            try {
                assertThat(ownerLocked.await(10, TimeUnit.SECONDS)).isTrue();
                var cleanup = executor.submit(() -> {
                    authenticate(stalePrincipal);
                    try {
                        assertThatThrownBy(() -> new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                            cleanupPid.set(jdbc.queryForObject("SELECT pg_backend_pid()", Integer.class));
                            service.cleanupUnavailableBookmarks(owner, request);
                        })).isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
                    } finally {
                        SecurityContextHolder.clearContext();
                    }
                });
                try {
                    awaitOwnerLockWait(cleanupPid, holderPid);
                    assertThat(cleanup.isDone()).isFalse();
                    // Change the authorization digest without changing NAV visibility/count. A reload
                    // before the owner lock would keep the old digest and wrongly delete this row.
                    jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                            + "VALUES(?,'OPERATION','MENU_READ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", group);
                    assertThat(authorizationSnapshots.load(owner).authorizationVersion()).isNotEqualTo(initial.authorizationVersion());
                } finally {
                    releaseOwner.countDown();
                }
                cleanup.get(10, TimeUnit.SECONDS);
                holder.get(10, TimeUnit.SECONDS);
            } finally {
                releaseOwner.countDown();
            }
        }
        assertThat(storedMenus(owner)).containsExactlyElementsOf(menus.subList(0, 29));
    }

    @Test
    void sameCountMetadataSwapCleansCurrentHiddenSetAndKeepsTheRestoredRow() {
        setUse(0, "N");
        var observed = service.getMyBookmarkStatus(owner);
        var request = request(observed.unavailableCount(), List.of());
        setUse(0, "Y");
        setUse(1, "N");
        assertThat(authorizationSnapshots.load(owner).authorizationVersion()).isEqualTo(request.expectedAuthorizationVersion());

        assertThat(service.cleanupUnavailableBookmarks(owner, request).removedCount()).isEqualTo(1);
        assertThat(storedMenus(owner)).hasSize(28).contains(menus.get(0)).doesNotContain(menus.get(1));
        assertThat(service.getMyBookmarkStatus(owner).unavailableCount()).isZero();
    }

    @Test
    void databaseFailureAfterFirstDeleteRollsBackTheWholeCleanup() {
        setUse(0, "N");
        setUse(1, "N");
        var before = storedMenus(owner);
        var request = request(2, List.of());
        // Synthetic identifiers/owner only; this Spring context refuses non-Testcontainers URLs.
        String fixtureFunction = "reject_bookmark_" + owner.toLowerCase(Locale.ROOT);
        jdbc.execute("CREATE FUNCTION " + fixtureFunction + "() RETURNS trigger LANGUAGE plpgsql AS $$ "
                + "BEGIN IF OLD.user_id='" + owner + "' AND (SELECT count(*) FROM tb_bkmk_menu_mng_rslt WHERE user_id='" + owner + "') < 29 "
                + "THEN RAISE EXCEPTION 'fixture bookmark delete failure after one delete'; END IF; RETURN OLD; END $$");
        try {
            jdbc.execute("CREATE TRIGGER " + fixtureFunction + " BEFORE DELETE ON tb_bkmk_menu_mng_rslt "
                    + "FOR EACH ROW EXECUTE FUNCTION " + fixtureFunction + "()");
            assertThatThrownBy(() -> service.cleanupUnavailableBookmarks(owner, request))
                    .isInstanceOf(RuntimeException.class).hasStackTraceContaining("fixture bookmark delete failure after one delete");
            assertThat(storedMenus(owner)).containsExactlyElementsOf(before);
        } finally {
            jdbc.execute("DROP TRIGGER IF EXISTS " + fixtureFunction + " ON tb_bkmk_menu_mng_rslt");
            jdbc.execute("DROP FUNCTION " + fixtureFunction + "()");
        }
        assertThat(service.getMyBookmarkStatus(owner).unavailableCount()).isEqualTo(2);
    }

    @Test
    void confirmedZeroUnavailableIsAnExplicitNoOp() {
        assertThat(service.cleanupUnavailableBookmarks(owner, request(0, List.of())).removedCount()).isZero();
        assertThat(storedMenus(owner)).containsExactlyElementsOf(menus.subList(0, 29));
    }

    private void concurrentAdds(boolean sameMenu) throws Exception {
        var firstInserted = new CountDownLatch(1);
        var releaseFirst = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> {
                authenticate();
                try {
                    new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                        service.addBookmark(owner, menus.get(29));
                        firstInserted.countDown();
                        try {
                            if (!releaseFirst.await(15, TimeUnit.SECONDS)) throw new IllegalStateException("fixture release timed out");
                        } catch (InterruptedException interrupted) {
                            Thread.currentThread().interrupt();
                            throw new IllegalStateException(interrupted);
                        }
                    });
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            assertThat(firstInserted.await(10, TimeUnit.SECONDS)).isTrue();
            var second = executor.submit(() -> {
                authenticate();
                try {
                    if (sameMenu) service.addBookmark(owner, menus.get(29));
                    else assertThatThrownBy(() -> service.addBookmark(owner, menus.get(30)))
                            .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
                } finally {
                    SecurityContextHolder.clearContext();
                }
            });
            try {
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
                boolean observed = false;
                while (System.nanoTime() < deadline) {
                    observed = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM pg_stat_activity "
                            + "WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%tb_user_info%')", Boolean.class));
                    if (observed) break;
                    LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(20));
                }
                assertThat(observed).as("second add waits for the same physical user row before quota checking").isTrue();
                assertThat(second.isDone()).isFalse();
            } finally {
                releaseFirst.countDown();
            }
            first.get(10, TimeUnit.SECONDS);
            second.get(10, TimeUnit.SECONDS);
        } finally {
            releaseFirst.countDown();
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_bkmk_menu_mng_rslt WHERE user_id=?", Long.class, owner)).isEqualTo(30L);
        assertThat(service.getMyBookmarks(owner)).hasSize(30);
        assertThatThrownBy(() -> service.addBookmark(owner + "X", menus.get(30)))
                .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
    }

    private MenuBookmarkCleanupRequest request(int hiddenCount, List<Long> uiUnavailableMenuNos) {
        return new MenuBookmarkCleanupRequest(authorizationSnapshots.load(owner).authorizationVersion(), hiddenCount, uiUnavailableMenuNos);
    }

    private List<Long> storedMenus(String esntlId) {
        return jdbc.queryForList("SELECT menu_id FROM tb_bkmk_menu_mng_rslt WHERE user_id=? ORDER BY menu_id", Long.class, esntlId);
    }

    private void setUse(int menuIndex, String useYn) {
        jdbc.update("UPDATE tb_menu_info SET use_yn=? WHERE menu_sn=?", useYn, menus.get(menuIndex));
    }

    private void assertConflictWithoutMutation(MenuBookmarkCleanupRequest request) {
        var before = storedMenus(owner);
        assertThatThrownBy(() -> service.cleanupUnavailableBookmarks(owner, request)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(storedMenus(owner)).containsExactlyElementsOf(before);
    }

    private void awaitOwnerLockWait(AtomicInteger waitingPid, AtomicInteger blockingPid) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        boolean observed = false;
        while (System.nanoTime() < deadline) {
            if (waitingPid.get() > 0 && blockingPid.get() > 0) {
                observed = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM pg_stat_activity "
                        + "WHERE pid=? AND wait_event_type='Lock' AND ?=ANY(pg_blocking_pids(pid)))",
                        Boolean.class, waitingPid.get(), blockingPid.get()));
            }
            if (observed) break;
            LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(20));
        }
        assertThat(observed).as("cleanup waits on the exact PostgreSQL session holding this owner's row").isTrue();
    }

    private static void awaitFixtureRelease(CountDownLatch release) {
        try {
            if (!release.await(20, TimeUnit.SECONDS)) throw new IllegalStateException("fixture release timed out");
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        }
    }

    private CustomUserDetails principal(AuthorizationSnapshotService.Snapshot snapshot) {
        return CustomUserDetails.builder().userId(ownerLogin).esntlId(owner).enabled(true).lockAt("N")
                .groups(snapshot.groups()).permissions(snapshot.permissions()).authorizationVersion(snapshot.authorizationVersion()).build();
    }

    private void authenticate() {
        authenticate(principal(authorizationSnapshots.load(owner)));
    }

    private static void authenticate(CustomUserDetails principal) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
