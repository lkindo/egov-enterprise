package nuri.api.schema;

import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("schema-validation")
@DisplayName("표준 길이 24개 정합과 SMS 수신자 키 보존")
class StandardLengthMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {
    private static final String TARGETS = """
            tb_adbk_manage adbk_nm 200
            tb_authrt_info authrt_nm 100
            tb_bbs_item pst_ttl 256
            tb_cmnty_info cmnty_nm 300
            tb_email_dsptch_manage eml_ttl 256
            tb_event_info pic_nm 100
            tb_extrl_hr_info ogdp_inst_nm 200
            tb_file_detail orgnl_file_nm 300
            tb_file_detail strg_file_nm 300
            tb_inst_cd inst_abbr_nm 300
            tb_inst_cd_rcptn_log inst_abbr_nm 300
            tb_menu_info rel_img_nm 300
            tb_note_info note_ttl 256
            tb_ognz_info ognz_nm 200
            tb_role_info role_nm 300
            tb_rward_manage rwrd_nm 300
            tb_schdl_info schdl_nm 300
            tb_sms_rcptn rcptn_telno 11
            tb_srvy_info srvy_prps 4000
            tb_srvy_info srvy_ttl 256
            tb_srvy_tmplt srvy_tmplt_path_nm 300
            tb_stmp_info mpng_file_nm 300
            tb_user_info daddr 200
            tb_user_info home_addr 200
            """;
    private static final String DEFERRED = """
            tb_prgrm_lst prgrm_file_nm 100
            tb_role_prgrm_map prgrm_file_nm 100
            tb_menu_info prgrm_file_nm 100
            tb_inst_cd chg_tm 20
            tb_inst_cd_rcptn_log chg_tm 20
            tb_user_info rrno 256
            """;

    @Test
    @DisplayName("잠금·표준 드리프트·초과 데이터·키 충돌을 거절하고 24개만 무손실 이행한다")
    void alignsLengthsAndPreservesSmsIdentityWithFailClosedChecks() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.90")).migrate();
        Map<String, String> before = new LinkedHashMap<>();
        Map<String, Long> files = new LinkedHashMap<>();
        try (Connection c = openConnection(); Statement s = c.createStatement()) {
            for (String line : TARGETS.lines().toList()) {
                String[] parts = line.split(" ");
                before.put(line, text(s, "SELECT md5(coalesce(string_agg(coalesce(" + parts[1]
                        + ",'<NULL>'),'|' ORDER BY " + parts[1] + "),'')) FROM " + parts[0]));
                files.put(parts[0], number(s, "SELECT pg_relation_filenode('" + parts[0] + "')"));
            }
            // 메타 불일치를 임의 덮어쓰기로 숨기지 않고 실패하는지 검증한다.
            s.executeUpdate("UPDATE meta_standard_domains SET data_length=201 WHERE domain_name='명V200'");
        }
        assertThatThrownBy(() -> flyway(MigrationVersion.fromVersion("2.91")).migrate())
                .isInstanceOf(FlywayException.class);
        try (Connection c = openConnection(); Statement s = c.createStatement()) {
            assertThat(length(s, "tb_adbk_manage", "adbk_nm")).isEqualTo(100);
            s.executeUpdate("UPDATE meta_standard_domains SET data_length=200 WHERE domain_name='명V200'");
        }
        try (Connection blocker = openConnection(); Statement s = blocker.createStatement()) {
            blocker.setAutoCommit(false);
            s.execute("LOCK TABLE tb_ognz_info IN ACCESS EXCLUSIVE MODE");
            long start = System.nanoTime();
            assertThatThrownBy(() -> flyway(MigrationVersion.fromVersion("2.91")).migrate())
                    .isInstanceOf(FlywayException.class);
            assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofSeconds(10));
            blocker.rollback();
        }
        flyway(MigrationVersion.fromVersion("2.91")).migrate();
        long sms;
        try (Connection c = openConnection(); Statement s = c.createStatement()) {
            for (String line : TARGETS.lines().toList()) {
                String[] p = line.split(" ");
                assertThat(text(s, "SELECT md5(coalesce(string_agg(coalesce(" + p[1]
                        + ",'<NULL>'),'|' ORDER BY " + p[1] + "),'')) FROM " + p[0]))
                        .as("%s values preserved", line).isEqualTo(before.get(line));
                assertThat(number(s, "SELECT pg_relation_filenode('" + p[0] + "')"))
                        .as("%s widening must not rewrite heap", p[0]).isEqualTo(files.get(p[0]));
            }
            sms = number(s, "INSERT INTO tb_sms_info(sndng_telno,sndng_cn) VALUES ('0212345678','length-fixture') RETURNING sms_trsm_sn");
            s.executeUpdate("INSERT INTO tb_sms_rcptn(sms_trsm_sn,rcptn_telno,rslt_cd,rslt_msg) VALUES ("
                    + sms + ",'010-1234-5678','S','preserved result')");
            s.executeUpdate("INSERT INTO tb_sms_rcptn(sms_trsm_sn,rcptn_telno,rslt_cd) VALUES ("
                    + sms + ",'01012345678','F')");
        }
        assertThatThrownBy(() -> flyway(MigrationVersion.fromVersion("2.92")).migrate())
                .as("canonical recipient collision must not merge/delete rows").isInstanceOf(FlywayException.class);
        try (Connection c = openConnection(); Statement s = c.createStatement()) {
            assertThat(number(s, "SELECT count(*) FROM tb_sms_rcptn WHERE sms_trsm_sn=" + sms)).isEqualTo(2);
            s.executeUpdate("DELETE FROM tb_sms_rcptn WHERE sms_trsm_sn=" + sms + " AND rcptn_telno='01012345678'");
            s.executeUpdate("UPDATE tb_user_info SET home_addr=repeat('가',201) WHERE user_id='webmaster'");
        }
        assertThatThrownBy(() -> flyway(MigrationVersion.fromVersion("2.92")).migrate())
                .as("oversized existing address must not be truncated").isInstanceOf(FlywayException.class);
        try (Connection c = openConnection(); Statement s = c.createStatement()) {
            assertThat(number(s, "SELECT char_length(home_addr) FROM tb_user_info WHERE user_id='webmaster'")).isEqualTo(201);
            assertThat(text(s, "SELECT rcptn_telno FROM tb_sms_rcptn WHERE sms_trsm_sn=" + sms)).isEqualTo("010-1234-5678");
            s.executeUpdate("UPDATE tb_user_info SET home_addr=repeat('가',200) WHERE user_id='webmaster'");
        }
        flyway(MigrationVersion.fromVersion("2.92")).migrate();
        try (Connection c = openConnection(); Statement s = c.createStatement()) {
            assertThat(length(s, "tb_sms_rcptn", "rcptn_telno")).isEqualTo(13);
            assertThat(text(s, "SELECT rcptn_telno FROM tb_sms_rcptn WHERE sms_trsm_sn=" + sms)).isEqualTo("01012345678");
            assertThat(text(s, "SELECT rslt_cd||':'||rslt_msg FROM tb_sms_rcptn WHERE sms_trsm_sn=" + sms))
                    .isEqualTo("S:preserved result");
            assertThatThrownBy(() -> s.executeUpdate("UPDATE tb_user_info SET home_addr=repeat('가',201) WHERE user_id='webmaster'"))
                    .isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> s.executeUpdate("INSERT INTO tb_sms_rcptn(sms_trsm_sn,rcptn_telno) VALUES (" + sms + ",'---')"))
                    .isInstanceOf(SQLException.class);
        }
        flyway(MigrationVersion.fromVersion("2.93")).migrate();
        try (Connection c = openConnection(); Statement s = c.createStatement()) {
            for (String line : (TARGETS + DEFERRED).lines().toList()) {
                String[] p = line.split(" ");
                assertThat(length(s,p[0],p[1])).as(line).isEqualTo(Integer.parseInt(p[2]));
            }
            assertThat(number(s,"SELECT char_length(home_addr) FROM tb_user_info WHERE user_id='webmaster'")).isEqualTo(200);
            assertThatThrownBy(() -> s.executeUpdate("UPDATE tb_role_info SET role_nm=repeat('가',301)"))
                    .isInstanceOf(SQLException.class);
            assertThat(s.executeUpdate("UPDATE tb_role_info SET role_nm=repeat('가',300)"))
                    .as("new 300-character role names must persist").isPositive();
            assertThat(number(s,"SELECT count(*) FROM tb_sms_rcptn r JOIN tb_sms_info h USING(sms_trsm_sn) WHERE r.sms_trsm_sn="+sms))
                    .isEqualTo(1);
        }
    }

    private static int length(Statement s,String table,String column) throws SQLException {
        return (int) number(s,"SELECT character_maximum_length FROM information_schema.columns WHERE table_schema='public' AND table_name='"
                +table+"' AND column_name='"+column+"'");
    }

    private static long number(Statement s,String sql) throws SQLException {
        try (ResultSet rs=s.executeQuery(sql)) { assertThat(rs.next()).isTrue(); return rs.getLong(1); }
    }

    private static String text(Statement s,String sql) throws SQLException {
        try (ResultSet rs=s.executeQuery(sql)) { assertThat(rs.next()).isTrue(); return rs.getString(1); }
    }
}
