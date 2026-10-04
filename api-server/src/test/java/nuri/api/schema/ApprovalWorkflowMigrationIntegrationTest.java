package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.sql.Statement;

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

            assertTemporaryDraftSchema(statement);
            assertReferenceSchema(statement, revision);
        }
    }

    /**
     * V2_123(2026-10-04 D4 개정 1): 결재 참조자. 지정은 차수 단위로 한 행이고(같은 차수의 재지정은 기본 키가 막는다), 같은 사람을
     * 다른 차수에 다시 지정하면 새 행이다. 지정 차수는 실제 결재 차수 이력에 묶인다. 참조자에는 사용자 FK 가 없다 — 문서 기록이라
     * 사용자를 지워도 남고, 지정된 적이 있는 사람을 지울 때 막히지 않는다. 지정한 사람은 두 축(esntlId·로그인 ID)이며 비울 수
     * 없다. 임시저장 참조자는 임시저장·사용자와 함께 지워진다.
     */
    private void assertReferenceSchema(Statement statement, String revision) throws SQLException {
        assertThat(statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_rfpr(ifml_atrz_sn,user_id,atrz_cycl,chg_user_idntfr,frst_rgtr_id,crt_dt)
                VALUES (%s,'WF_REF',1,'WF_APPLICANT','wf_applicant',CURRENT_TIMESTAMP),
                       (%s,'WF_NOBODY',1,'WF_APPROVER','wf_approver',CURRENT_TIMESTAMP)
                """.formatted(revision, revision))).as("참조자에는 사용자 FK 가 없다").isEqualTo(2);
        assertThatThrownBy(() -> statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_rfpr(ifml_atrz_sn,user_id,atrz_cycl,chg_user_idntfr,frst_rgtr_id,crt_dt)
                VALUES (%s,'WF_REF',1,'WF_APPLICANT','wf_applicant',CURRENT_TIMESTAMP)
                """.formatted(revision))).as("한 사람은 한 차수에 한 번만 지정된다")
                .isInstanceOf(SQLException.class).hasMessageContaining("pk_tb_ifml_atrz_rfpr");
        assertThatThrownBy(() -> statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_rfpr(ifml_atrz_sn,user_id,atrz_cycl,chg_user_idntfr,frst_rgtr_id,crt_dt)
                VALUES (%s,'WF_REF2',2,'WF_APPLICANT','wf_applicant',CURRENT_TIMESTAMP)
                """.formatted(revision))).as("지정 차수는 실제 결재 차수여야 한다")
                .isInstanceOf(SQLException.class).hasMessageContaining("foreign key");
        // [개정 1] 지정은 차수 단위다 — 다음 차수가 생기면 이전 차수 참조자를 그 차수로 다시 지정할 수 있다(새 행). 문서 단위
        //   기본 키면 다시 지정한 사람이 첫 차수에만 남아 '지금 차수의 참조자'(최종 결과 알림·겸직 금지)를 가를 수 없다.
        statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_hstry(ifml_atrz_sn,atrz_cycl,task_se_cd,aprv_yn) VALUES (%s,2,'WF_TEST','A')
                """.formatted(revision));
        assertThat(statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_rfpr(ifml_atrz_sn,user_id,atrz_cycl,chg_user_idntfr,frst_rgtr_id,crt_dt)
                VALUES (%s,'WF_REF',2,'WF_APPLICANT','wf_applicant',CURRENT_TIMESTAMP)
                """.formatted(revision))).as("같은 사람도 다른 차수에 다시 지정하면 새 행이다").isEqualTo(1);
        assertThat(count(statement, "tb_ifml_atrz_rfpr WHERE ifml_atrz_sn=" + revision + " AND user_id='WF_REF'")).isEqualTo(2);
        assertThatThrownBy(() -> statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_rfpr(ifml_atrz_sn,user_id,atrz_cycl,chg_user_idntfr,frst_rgtr_id,crt_dt)
                VALUES (%s,'WF_REF',2,'WF_APPROVER','wf_approver',CURRENT_TIMESTAMP)
                """.formatted(revision))).as("같은 차수에는 지정한 사람이 달라도 한 행이다")
                .isInstanceOf(SQLException.class).hasMessageContaining("pk_tb_ifml_atrz_rfpr");
        try (var pk = statement.executeQuery(
                "SELECT indexdef FROM pg_indexes WHERE indexname='pk_tb_ifml_atrz_rfpr'")) {
            assertThat(pk.next()).isTrue();
            assertThat(pk.getString(1)).as("문서별 조회(목록·상세)가 기본 키 앞부분을 쓴다")
                    .contains("(ifml_atrz_sn, atrz_cycl, user_id)");
        }
        for (String[] missing : new String[][]{
                {"atrz_cycl", "NULL", "'WF_APPLICANT'", "'wf_applicant'"},
                {"chg_user_idntfr", "1", "NULL", "'wf_applicant'"},
                {"frst_rgtr_id", "1", "'WF_APPLICANT'", "NULL"}}) {
            assertThatThrownBy(() -> statement.executeUpdate("""
                    INSERT INTO tb_ifml_atrz_rfpr(ifml_atrz_sn,user_id,atrz_cycl,chg_user_idntfr,frst_rgtr_id,crt_dt)
                    VALUES (%s,'WF_REF3',%s,%s,%s,CURRENT_TIMESTAMP)
                    """.formatted(revision, missing[1], missing[2], missing[3])))
                    .isInstanceOf(SQLException.class).hasMessageContaining(missing[0]);
        }

        // 지정된 적이 있는 사람을 지워도 막히지 않고, 참조 행은 문서 기록으로 남는다.
        statement.executeUpdate("""
                INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd)
                VALUES ('WF_REFUSER','wf_refuser','reference fixture','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))
                """);
        statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_rfpr(ifml_atrz_sn,user_id,atrz_cycl,chg_user_idntfr,frst_rgtr_id,crt_dt)
                VALUES (%s,'WF_REFUSER',1,'WF_APPLICANT','wf_applicant',CURRENT_TIMESTAMP)
                """.formatted(revision));
        assertThat(statement.executeUpdate("DELETE FROM tb_user_info WHERE esntl_id='WF_REFUSER'")).isEqualTo(1);
        assertThat(count(statement, "tb_ifml_atrz_rfpr WHERE user_id='WF_REFUSER'")).isEqualTo(1);

        try (var index = statement.executeQuery(
                "SELECT indexdef FROM pg_indexes WHERE indexname='ix_tb_ifml_atrz_rfpr_user_id'")) {
            assertThat(index.next()).isTrue();
            assertThat(index.getString(1)).as("'참조된 결재' 목록의 EXISTS 는 참조자부터 찾는다")
                    .contains("(user_id, ifml_atrz_sn)");
        }

        // 임시저장 참조자: 사람에는 FK 가 없고, 임시저장·사용자 행과 함께 지워진다(상신 때의 한 문장 삭제가 막히지 않는다).
        long draft = insertDraft(statement, "WF_DRAFTER");
        assertThat(statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_tmpr_strg_rfpr(ifml_atrz_tmpr_strg_sn,user_id,crt_dt,mdfcn_dt)
                VALUES (%d,'WF_NOBODY',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """.formatted(draft))).isEqualTo(1);
        assertThatThrownBy(() -> statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_tmpr_strg_rfpr(ifml_atrz_tmpr_strg_sn,user_id,crt_dt,mdfcn_dt)
                VALUES (%d,'WF_NOBODY',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """.formatted(draft))).isInstanceOf(SQLException.class).hasMessageContaining("pk_tb_ifml_atrz_tmpr_strg_rfpr");
        assertThatThrownBy(() -> statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_tmpr_strg_rfpr(ifml_atrz_tmpr_strg_sn,user_id,crt_dt,mdfcn_dt)
                VALUES (-1,'WF_NOBODY',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """)).isInstanceOf(SQLException.class).hasMessageContaining("foreign key");
        statement.executeUpdate("DELETE FROM tb_ifml_atrz_tmpr_strg WHERE ifml_atrz_tmpr_strg_sn=" + draft);
        assertThat(count(statement, "tb_ifml_atrz_tmpr_strg_rfpr WHERE ifml_atrz_tmpr_strg_sn=" + draft)).isZero();
        statement.executeUpdate("""
                INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd)
                VALUES ('WF_REFLEAVER','wf_refleaver','reference fixture','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))
                """);
        long leaving = insertDraft(statement, "WF_REFLEAVER");
        statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_tmpr_strg_rfpr(ifml_atrz_tmpr_strg_sn,user_id,crt_dt,mdfcn_dt)
                VALUES (%d,'WF_REF',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """.formatted(leaving));
        statement.executeUpdate("DELETE FROM tb_user_info WHERE esntl_id='WF_REFLEAVER'");
        assertThat(count(statement, "tb_ifml_atrz_tmpr_strg_rfpr WHERE ifml_atrz_tmpr_strg_sn=" + leaving)).isZero();

        try (var comments = statement.executeQuery("""
                SELECT c.relname || '.' || a.attname, col_description(c.oid, a.attnum)
                FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
                WHERE c.relname IN ('tb_ifml_atrz_rfpr','tb_ifml_atrz_tmpr_strg_rfpr')
                  AND a.attname IN ('user_id','chg_user_idntfr','frst_rgtr_id')
                ORDER BY 1
                """)) {
            java.util.Map<String, String> byColumn = new java.util.LinkedHashMap<>();
            while (comments.next()) byColumn.put(comments.getString(1), comments.getString(2));
            assertThat(byColumn).hasSize(5);
            assertThat(byColumn.get("tb_ifml_atrz_rfpr.user_id")).contains("esntlId");
            assertThat(byColumn.get("tb_ifml_atrz_rfpr.chg_user_idntfr")).contains("esntlId");
            assertThat(byColumn.get("tb_ifml_atrz_rfpr.frst_rgtr_id")).contains("loginId");
            assertThat(byColumn.get("tb_ifml_atrz_tmpr_strg_rfpr.user_id")).contains("esntlId");
            assertThat(byColumn.get("tb_ifml_atrz_tmpr_strg_rfpr.frst_rgtr_id")).contains("loginId");
        }
        for (String[] table : new String[][]{{"tb_ifml_atrz_rfpr", "비공식결재참조자"},
                {"tb_ifml_atrz_tmpr_strg_rfpr", "비공식결재임시저장참조자"}}) {
            try (var comment = statement.executeQuery(
                    "SELECT obj_description('" + table[0] + "'::regclass, 'pg_class')")) {
                assertThat(comment.next()).isTrue();
                assertThat(comment.getString(1)).startsWith(table[1]);
            }
        }
        // 새 용어는 없다 — 열은 모두 등록된 용어다(참조자 열은 결재선과 같은 사용자아이디).
        assertThat(count(statement, "meta_standard_terms WHERE eng_abbr LIKE 'RFPR%' AND eng_abbr <> 'RFPR_NM'")).isZero();
    }

    /**
     * V2_122(2026-10-03 D3): 결재 기안 임시저장. 기안자는 실제 사용자 행에 묶이고 그 행과 함께 지워지며, 결재선은 임시저장과
     * 함께 지워진다. 결재선 사람에는 FK 가 없다(남의 임시저장에 든 사람을 지울 때 막히지 않는다). 단계와 유형은 결재 표와 같은
     * 제약을 지닌다. 버전은 결재 표와 같은 `version integer` 이며 0 에서 시작한다.
     */
    private void assertTemporaryDraftSchema(Statement statement) throws SQLException {
        statement.executeUpdate("""
                INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd)
                VALUES ('WF_DRAFTER','wf_drafter','draft fixture','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD')),
                       ('WF_LEAVER','wf_leaver','draft fixture','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))
                """);
        long draft = insertDraft(statement, "WF_DRAFTER");
        try (var row = statement.executeQuery(
                "SELECT version FROM tb_ifml_atrz_tmpr_strg WHERE ifml_atrz_tmpr_strg_sn=" + draft)) {
            assertThat(row.next()).isTrue();
            assertThat(row.getInt(1)).isZero();
        }
        assertThat(statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_tmpr_strg_dtl(ifml_atrz_tmpr_strg_sn,atrz_seq,user_id,crt_dt,mdfcn_dt)
                VALUES (%d,1,'WF_NOBODY',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """.formatted(draft))).as("결재선 사람에는 FK 가 없다").isEqualTo(1);
        try (var row = statement.executeQuery(
                "SELECT acrd_yn FROM tb_ifml_atrz_tmpr_strg_dtl WHERE ifml_atrz_tmpr_strg_sn=" + draft)) {
            assertThat(row.next()).isTrue();
            assertThat(row.getString(1)).isEqualTo("N");
        }
        assertThatThrownBy(() -> statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_tmpr_strg(aplcnt_id,crt_dt,mdfcn_dt) VALUES (NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """)).isInstanceOf(SQLException.class).hasMessageContaining("aplcnt_id");
        assertThatThrownBy(() -> insertDraft(statement, "WF_UNKNOWN_USER"))
                .isInstanceOf(SQLException.class).hasMessageContaining("fk_tb_ifml_atrz_tmpr_strg_tb_user_info");
        assertThatThrownBy(() -> statement.executeUpdate("""
                UPDATE tb_ifml_atrz_tmpr_strg SET version=-1 WHERE ifml_atrz_tmpr_strg_sn=%d
                """.formatted(draft))).isInstanceOf(SQLException.class).hasMessageContaining("ck_tb_ifml_atrz_tmpr_strg_version");
        assertThatThrownBy(() -> statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_tmpr_strg_dtl(ifml_atrz_tmpr_strg_sn,atrz_seq,user_id,crt_dt,mdfcn_dt)
                VALUES (-1,1,'WF_APPROVER',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """)).isInstanceOf(SQLException.class).hasMessageContaining("foreign key");
        for (String seq : new String[]{"0", "11"}) {
            assertThatThrownBy(() -> statement.executeUpdate("""
                    INSERT INTO tb_ifml_atrz_tmpr_strg_dtl(ifml_atrz_tmpr_strg_sn,atrz_seq,user_id,crt_dt,mdfcn_dt)
                    VALUES (%d,%s,'WF_SEQ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                    """.formatted(draft, seq))).isInstanceOf(SQLException.class)
                    .hasMessageContaining("ck_tb_ifml_atrz_tmpr_strg_dtl_atrz_seq");
        }
        assertThatThrownBy(() -> statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_tmpr_strg_dtl(ifml_atrz_tmpr_strg_sn,atrz_seq,user_id,acrd_yn,crt_dt,mdfcn_dt)
                VALUES (%d,2,'WF_KIND','X',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """.formatted(draft))).isInstanceOf(SQLException.class)
                .hasMessageContaining("ck_tb_ifml_atrz_tmpr_strg_dtl_acrd_yn");

        // 임시저장을 지우면 결재선도 함께 지워진다(상신 때의 조건부 삭제가 결재선을 따로 지우지 않는다).
        statement.executeUpdate("DELETE FROM tb_ifml_atrz_tmpr_strg WHERE ifml_atrz_tmpr_strg_sn=" + draft);
        assertThat(count(statement, "tb_ifml_atrz_tmpr_strg_dtl WHERE ifml_atrz_tmpr_strg_sn=" + draft)).isZero();

        // 사용자 행을 지우면 그 사람의 임시저장과 결재선이 함께 지워진다 — 미상신 본문을 고아로 남기지 않는다.
        long leaving = insertDraft(statement, "WF_LEAVER");
        statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_tmpr_strg_dtl(ifml_atrz_tmpr_strg_sn,atrz_seq,user_id,acrd_yn,crt_dt,mdfcn_dt)
                VALUES (%d,1,'WF_DRAFTER','Y',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """.formatted(leaving));
        statement.executeUpdate("DELETE FROM tb_user_info WHERE esntl_id='WF_LEAVER'");
        assertThat(count(statement, "tb_ifml_atrz_tmpr_strg WHERE aplcnt_id='WF_LEAVER'")).isZero();
        assertThat(count(statement, "tb_ifml_atrz_tmpr_strg_dtl WHERE ifml_atrz_tmpr_strg_sn=" + leaving)).isZero();
        // 결재선에 든 사람을 지우는 쪽은 남의 임시저장 때문에 막히지 않고, 남의 임시저장도 조용히 바뀌지 않는다.
        long others = insertDraft(statement, "WF_DRAFTER");
        statement.executeUpdate("""
                INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd)
                VALUES ('WF_LISTED','wf_listed','draft fixture','!authentication-disabled!','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))
                """);
        statement.executeUpdate("""
                INSERT INTO tb_ifml_atrz_tmpr_strg_dtl(ifml_atrz_tmpr_strg_sn,atrz_seq,user_id,crt_dt,mdfcn_dt)
                VALUES (%d,1,'WF_LISTED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
                """.formatted(others));
        assertThat(statement.executeUpdate("DELETE FROM tb_user_info WHERE esntl_id='WF_LISTED'")).isEqualTo(1);
        assertThat(count(statement, "tb_ifml_atrz_tmpr_strg_dtl WHERE ifml_atrz_tmpr_strg_sn=" + others))
                .as("다시 열 때 없는 사람으로 판정한다").isEqualTo(1);

        try (var sequence = statement.executeQuery(
                "SELECT pg_get_serial_sequence('tb_ifml_atrz_tmpr_strg','ifml_atrz_tmpr_strg_sn')")) {
            assertThat(sequence.next()).isTrue();
            assertThat(sequence.getString(1)).isEqualTo("public.sq_ifml_atrz_tmpr_strg_sn");
        }
        try (var term = statement.executeQuery("""
                SELECT term_name, domain_name FROM meta_standard_terms WHERE eng_abbr='IFML_ATRZ_TMPR_STRG_SN'
                """)) {
            assertThat(term.next()).isTrue();
            assertThat(term.getString(1)).isEqualTo("비공식결재임시저장일련번호");
            assertThat(term.getString(2)).isEqualTo("일련번호N19");
        }
        try (var comments = statement.executeQuery("""
                SELECT c.relname || '.' || a.attname, col_description(c.oid, a.attnum)
                FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
                WHERE c.relname IN ('tb_ifml_atrz_tmpr_strg','tb_ifml_atrz_tmpr_strg_dtl')
                  AND a.attname IN ('aplcnt_id','user_id','frst_rgtr_id')
                ORDER BY 1
                """)) {
            java.util.Map<String, String> byColumn = new java.util.LinkedHashMap<>();
            while (comments.next()) byColumn.put(comments.getString(1), comments.getString(2));
            assertThat(byColumn).hasSize(4);
            assertThat(byColumn.get("tb_ifml_atrz_tmpr_strg.aplcnt_id")).contains("esntlId");
            assertThat(byColumn.get("tb_ifml_atrz_tmpr_strg_dtl.user_id")).contains("esntlId");
            assertThat(byColumn.get("tb_ifml_atrz_tmpr_strg.frst_rgtr_id")).contains("loginId");
            assertThat(byColumn.get("tb_ifml_atrz_tmpr_strg_dtl.frst_rgtr_id")).contains("loginId");
        }
        try (var table = statement.executeQuery("SELECT obj_description('tb_ifml_atrz_tmpr_strg'::regclass, 'pg_class')")) {
            assertThat(table.next()).isTrue();
            assertThat(table.getString(1)).startsWith("비공식결재임시저장");
        }
    }

    private static long insertDraft(Statement statement, String applicant) throws SQLException {
        try (var row = statement.executeQuery("""
                INSERT INTO tb_ifml_atrz_tmpr_strg(aplcnt_id,doc_ttl,crt_dt,mdfcn_dt)
                VALUES ('%s','쓰다 만 기안',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING ifml_atrz_tmpr_strg_sn
                """.formatted(applicant))) {
            assertThat(row.next()).isTrue();
            return row.getLong(1);
        }
    }

    private static int count(Statement statement, String fromWhere) throws SQLException {
        try (var row = statement.executeQuery("SELECT count(*) FROM " + fromWhere)) {
            assertThat(row.next()).isTrue();
            return row.getInt(1);
        }
    }
}
