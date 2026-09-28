package nuri.api.schema;

import nuri.business.service.system.content.community.CommunityService;
import nuri.business.service.system.content.community.dto.CommunityDto;
import nuri.business.service.template.TmplatInfoService;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import javax.sql.DataSource;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.assertj.core.api.Assertions.*;

@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class CommunityTemplateIntegrityIntegrationTest {
    @Autowired CommunityService communities;
    @Autowired TmplatInfoService templates;
    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;
    @Autowired PlatformTransactionManager transactionManager;
    private String id;

    @BeforeEach void seedOwnTemplate() {
        id = "CT" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        jdbc.update("INSERT INTO tb_tmplt_info(tmplt_id,tmplt_nm,tmplt_se_cd,tmplt_path,use_yn) VALUES (?,?,'TMPT02','metadata-only','Y')", id, id);
    }
    @AfterEach void cleanupOwnRows() {
        jdbc.update("DELETE FROM tb_cmnty_info WHERE cmnty_nm=?", id);
        jdbc.update("DELETE FROM tb_tmplt_info WHERE tmplt_id=?", id);
    }
    private CommunityDto request(String template) {
        return CommunityDto.builder().cmntyNm(id).cmntyIntroCn("내용").tmpltId(template).useYn("Y").build();
    }

    @Test void rejectsMissingOrInactiveSelectionButKeepsExistingInactiveReferenceAndProtectsDeletion() {
        assertThatThrownBy(() -> communities.createCommunity("fixture", request(id + "M"))).isInstanceOf(BusinessException.class);
        jdbc.update("UPDATE tb_tmplt_info SET use_yn='N' WHERE tmplt_id=?", id);
        assertThatThrownBy(() -> communities.createCommunity("fixture", request(id))).isInstanceOf(BusinessException.class);
        assertThat(countCommunities()).isZero();
        jdbc.update("UPDATE tb_tmplt_info SET use_yn='Y' WHERE tmplt_id=?", id);
        long community = communities.createCommunity("fixture", request(id)).getCmntySn();
        jdbc.update("UPDATE tb_tmplt_info SET use_yn='N' WHERE tmplt_id=?", id);
        var same = request(id);
        same.setCmntySn(community);
        same.setCmntyIntroCn("정정");
        communities.updateCommunity("fixture", same);
        assertThat(jdbc.queryForObject("SELECT cmnty_intro_cn FROM tb_cmnty_info WHERE cmnty_sn=?", String.class, community)).isEqualTo("정정");
        communities.deleteCommunity(community, "fixture");
        assertThatThrownBy(() -> templates.deleteTmplatInfo(id)).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.RESOURCE_IN_USE);
        same.setTmpltId(null);
        communities.updateCommunity("fixture", same);
        templates.deleteTmplatInfo(id);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM tb_tmplt_info WHERE tmplt_id=?", Integer.class, id)).isZero();
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans = {false, true})
    void newAssignmentWaitsForConcurrentDisableOrDeletionAndCannotCreateDanglingReference(boolean delete) throws Exception {
        String application = "template-assign-" + id;
        try (var executor = Executors.newSingleThreadExecutor(); var blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try (var change = blocker.prepareStatement(delete ? "DELETE FROM tb_tmplt_info WHERE tmplt_id=?"
                    : "UPDATE tb_tmplt_info SET use_yn='N' WHERE tmplt_id=?")) {
                change.setString(1, id);
                change.executeUpdate();
            }
            var pending = executor.submit(() -> new TransactionTemplate(transactionManager).execute(status -> {
                jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                return communities.createCommunity("fixture", request(id));
            }));
            try {
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                int waiting;
                do {
                    waiting = jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock'", Integer.class, application);
                    if (waiting == 0) Thread.sleep(20);
                } while (waiting == 0 && System.nanoTime() < deadline);
                assertThat(waiting).isEqualTo(1);
            } finally { blocker.commit(); }
            assertThatThrownBy(() -> pending.get(20, TimeUnit.SECONDS)).hasCauseInstanceOf(BusinessException.class);
        }
        assertThat(countCommunities()).isZero();
    }

    private int countCommunities() {
        return jdbc.queryForObject("SELECT count(*) FROM tb_cmnty_info WHERE cmnty_nm=?", Integer.class, id);
    }

    @Test void logicalDeletionCannotRestoreTemplateReferenceFromAStaleCommunitySnapshot() throws Exception {
        long community = communities.createCommunity("fixture", request(id)).getCmntySn();
        String application = "community-close-" + id;
        try (var executor = Executors.newSingleThreadExecutor(); var blocker = dataSource.getConnection()) {
            blocker.setAutoCommit(false);
            try (var change = blocker.prepareStatement("UPDATE tb_cmnty_info SET tmplt_id=NULL WHERE cmnty_sn=?")) {
                change.setLong(1, community);
                change.executeUpdate();
            }
            var pending = executor.submit(() -> new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                jdbc.queryForObject("SELECT set_config('application_name', ?, true)", String.class, application);
                communities.deleteCommunity(community, "fixture");
            }));
            try {
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                int waiting;
                do {
                    waiting = jdbc.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND application_name=? AND wait_event_type='Lock'", Integer.class, application);
                    if (waiting == 0) Thread.sleep(20);
                } while (waiting == 0 && System.nanoTime() < deadline);
                assertThat(waiting).isEqualTo(1);
            } finally { blocker.commit(); }
            pending.get(20, TimeUnit.SECONDS);
        }
        assertThat(jdbc.queryForObject("SELECT tmplt_id FROM tb_cmnty_info WHERE cmnty_sn=?", String.class, community)).isNull();
        assertThat(jdbc.queryForObject("SELECT use_yn FROM tb_cmnty_info WHERE cmnty_sn=?", String.class, community)).isEqualTo("N");
        templates.deleteTmplatInfo(id);
    }
}
