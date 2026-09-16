package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("schema-validation")
class ApprovalWorkflowMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {
    @Test
    void preservesLegacyDecisionsAndCreatesReferentiallyBoundFirstRevision() throws Exception {
        flyway(MigrationVersion.fromVersion("2.99")).migrate();
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO tb_ifml_atrz_info (task_se_cd, aplcnt_id, req_ymd, aprvr_id, aprv_yn, rjct_rsn_cn)
                    VALUES ('WF_TEST', 'WF_APPLICANT', '20260916', 'WF_APPROVER', 'A', NULL),
                           ('WF_TEST', 'WF_APPLICANT', '20260916', 'WF_APPROVER', 'C', NULL),
                           ('WF_TEST', 'WF_APPLICANT', '20260916', 'WF_APPROVER', 'R', '검토 내용 보완'),
                           ('WF_TEST', 'WF_APPLICANT', '20260916', 'WF_APPROVER', NULL, NULL)
                    """);
        }
        migrateThroughAuthorizationCutover();
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            try (var rows = statement.executeQuery("""
                    SELECT h.aprv_yn, r.aprv_yn, l.aprv_yn, l.user_id, l.atrz_seq, r.atrz_cycl,
                           r.rjct_rsn_cn, l.atrz_opnn_cn
                    FROM tb_ifml_atrz_info h
                    JOIN tb_ifml_atrz_hstry r ON r.ifml_atrz_sn=h.ifml_atrz_sn AND r.atrz_cycl=h.atrz_cycl
                    JOIN tb_ifml_atrz_dtl l ON l.ifml_atrz_sn=r.ifml_atrz_sn AND l.atrz_cycl=r.atrz_cycl
                    WHERE h.aplcnt_id='WF_APPLICANT' ORDER BY h.aprv_yn
                    """)) {
                int count = 0;
                while (rows.next()) {
                    count++;
                    assertThat(rows.getString(2)).isEqualTo(rows.getString(1));
                    assertThat(rows.getString(3)).isEqualTo(rows.getString(1));
                    assertThat(rows.getString(4)).isEqualTo("WF_APPROVER");
                    assertThat(rows.getInt(5)).isEqualTo(1);
                    assertThat(rows.getInt(6)).isEqualTo(1);
                    if ("R".equals(rows.getString(1))) {
                        assertThat(rows.getString(7)).isEqualTo("검토 내용 보완");
                        assertThat(rows.getString(8)).isEqualTo("검토 내용 보완");
                    }
                }
                assertThat(count).isEqualTo(4);
            }
            assertThatThrownBy(() -> statement.executeUpdate("""
                    INSERT INTO tb_ifml_atrz_dtl(ifml_atrz_sn,atrz_cycl,atrz_seq,user_id,aprv_yn)
                    VALUES (-1,1,1,'WF_APPROVER','A')
                    """)).isInstanceOf(SQLException.class).hasMessageContaining("foreign key");
        }
    }
}
