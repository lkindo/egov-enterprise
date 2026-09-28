package nuri.api.schema;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.LockSupport;
import nuri.business.service.menu.MenuBookmarkService;
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

/** F04: a real PostgreSQL row lock protects the thirty-item quota across distinct inserts. */
@Tag("schema-validation")
@SpringBootTest
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class MenuBookmarkConcurrencyIntegrationTest {
    @Autowired private MenuBookmarkService service;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    private String owner;
    private String group;
    private final List<Long> menus = new ArrayList<>();

    @BeforeEach
    void seedDisposableFixtures() {
        owner = "BM" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        group = owner + "G";
        jdbc.update("INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd) "
                + "VALUES(?,?,'bookmark fixture','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))", owner, owner);
        jdbc.update("INSERT INTO tb_authrt_info(authrt_cd,authrt_nm,authrt_crt_ymd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                + "VALUES(?,'bookmark fixture',to_char(CURRENT_DATE,'YYYYMMDD'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", group);
        for (int index = 0; index < 31; index++) {
            Long menu = jdbc.queryForObject("INSERT INTO tb_menu_info(menu_nm,menu_ordr,use_yn) VALUES('bookmark fixture',?,'Y') RETURNING menu_sn", Long.class, index);
            menus.add(menu);
            jdbc.update("INSERT INTO tb_authrt_grnt_map(authrt_cd,authrt_type_cd,authrt_grnt_cd,crt_dt,mdfcn_dt,frst_rgtr_id,last_mdfr_id) "
                    + "VALUES(?,'NAVIGATION',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'SYSTEM','SYSTEM')", group, menu.toString());
            if (index < 29) jdbc.update("INSERT INTO tb_bkmk_menu_mng_rslt(menu_id,user_id,menu_nm) VALUES(?,?,'bookmark fixture')", menu, owner);
        }
        authenticate();
    }

    @AfterEach
    void cleanDisposableFixtures() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_bkmk_menu_mng_rslt WHERE user_id=?", owner);
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd=?", group);
        jdbc.update("DELETE FROM tb_authrt_info WHERE authrt_cd=?", group);
        for (Long menu : menus) jdbc.update("DELETE FROM tb_menu_info WHERE menu_sn=?", menu);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", owner);
    }

    @Test
    void differentSimultaneousAddsCannotExceedThirty() throws Exception {
        concurrentAdds(false);
    }

    @Test
    void sameSimultaneousAddRemainsIdempotentAtTheLimit() throws Exception {
        concurrentAdds(true);
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

    private void authenticate() {
        var principal = CustomUserDetails.builder().userId(owner).esntlId(owner).enabled(true).lockAt("N")
                .groups(List.of(group)).permissions(List.of()).authorizationVersion("bookmark-fixture").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
}
