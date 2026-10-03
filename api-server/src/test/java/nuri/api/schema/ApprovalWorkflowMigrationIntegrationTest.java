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

            // V2_121: 처리 이력은 결재 차수에 묶이고, 유형마다 필요한 값이 있어야 들어간다. 처리한 사람은 두 축이다 —
            //   chg_user_idntfr 는 esntlId, frst_rgtr_id 는 공통 감사 계약의 로그인 ID 이며 둘 다 비울 수 없다.
            // 진행 중(A) 문서는 둘이다 — 상태가 NULL 이던 행도 V2_101 이 A 로 옮긴다. 하나만 골라 차수 1 에 묶는다.
            String revision = "(SELECT min(ifml_atrz_sn) FROM tb_ifml_atrz_info WHERE aplcnt_id='WF_APPLICANT' AND aprv_yn='A')";
            assertThat(statement.executeUpdate("""
                    INSERT INTO tb_ifml_atrz_prcs_hstry(ifml_atrz_sn,atrz_cycl,prcs_type_cd,trgt_user_id,bfr_user_id,
                                                        chg_user_idntfr,frst_rgtr_id,crt_dt)
                    VALUES (%s,1,'REPLACE','WF_NEW','WF_APPROVER','WF_APPLICANT','wf_applicant',CURRENT_TIMESTAMP),
                           (%s,1,'REMIND',NULL,NULL,'WF_APPLICANT','wf_applicant',CURRENT_TIMESTAMP)
                    """.formatted(revision, revision))).isEqualTo(2);
            assertThatThrownBy(() -> statement.executeUpdate("""
                    INSERT INTO tb_ifml_atrz_prcs_hstry(ifml_atrz_sn,atrz_cycl,prcs_type_cd,frst_rgtr_id,crt_dt)
                    VALUES (%s,1,'REMIND','wf_applicant',CURRENT_TIMESTAMP)
                    """.formatted(revision))).isInstanceOf(SQLException.class).hasMessageContaining("chg_user_idntfr");
            assertThatThrownBy(() -> statement.executeUpdate("""
                    INSERT INTO tb_ifml_atrz_prcs_hstry(ifml_atrz_sn,atrz_cycl,prcs_type_cd,chg_user_idntfr,crt_dt)
                    VALUES (%s,1,'REMIND','WF_APPLICANT',CURRENT_TIMESTAMP)
                    """.formatted(revision))).isInstanceOf(SQLException.class).hasMessageContaining("frst_rgtr_id");
            assertThatThrownBy(() -> statement.executeUpdate("""
                    INSERT INTO tb_ifml_atrz_prcs_hstry(ifml_atrz_sn,atrz_cycl,prcs_type_cd,chg_user_idntfr,frst_rgtr_id,crt_dt)
                    VALUES (%s,1,'ASK','WF_APPROVER','wf_approver',CURRENT_TIMESTAMP)
                    """.formatted(revision))).isInstanceOf(SQLException.class).hasMessageContaining("ck_tb_ifml_atrz_prcs_hstry_shape");
            assertThatThrownBy(() -> statement.executeUpdate("""
                    INSERT INTO tb_ifml_atrz_prcs_hstry(ifml_atrz_sn,atrz_cycl,prcs_type_cd,prcs_cn,chg_user_idntfr,frst_rgtr_id,crt_dt)
                    VALUES (%s,1,'DELEGATE','x','WF_APPROVER','wf_approver',CURRENT_TIMESTAMP)
                    """.formatted(revision))).isInstanceOf(SQLException.class).hasMessageContaining("ck_tb_ifml_atrz_prcs_hstry_prcs_type_cd");
            assertThatThrownBy(() -> statement.executeUpdate("""
                    INSERT INTO tb_ifml_atrz_prcs_hstry(ifml_atrz_sn,atrz_cycl,prcs_type_cd,chg_user_idntfr,frst_rgtr_id,crt_dt)
                    VALUES (%s,2,'REMIND','WF_APPLICANT','wf_applicant',CURRENT_TIMESTAMP)
                    """.formatted(revision))).isInstanceOf(SQLException.class).hasMessageContaining("foreign key");
            try (var comments = statement.executeQuery("""
                    SELECT col_description('tb_ifml_atrz_prcs_hstry'::regclass, a.attnum)
                    FROM pg_attribute a
                    WHERE a.attrelid='tb_ifml_atrz_prcs_hstry'::regclass AND a.attname IN ('chg_user_idntfr','frst_rgtr_id')
                    ORDER BY a.attname
                    """)) {
                assertThat(comments.next()).isTrue();
                assertThat(comments.getString(1)).contains("esntlId");
                assertThat(comments.next()).isTrue();
                assertThat(comments.getString(1)).contains("loginId");
            }
        }
    }
}
