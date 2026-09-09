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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("schema-validation")
@DisplayName("ADR-0014: 보류 6개 표준 설계 이행 및 실패 시 데이터 보존")
class DeferredStandardDesignMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {
    @Test
    void preservesCiphertextNavigationAndKeysAndRejectsAmbiguousData() throws Exception {
        migrate("2.93");
        String menusBefore;
        String rolesBefore;
        try (Connection c=openConnection(); Statement s=c.createStatement()) {
            menusBefore=text(s,"SELECT md5(string_agg((to_jsonb(m)-'prgrm_file_nm')::text,'|' ORDER BY menu_sn)) FROM tb_menu_info m");
            rolesBefore=text(s,"SELECT md5(string_agg(to_jsonb(r)::text,'|' ORDER BY role_id,prgrm_file_nm)) FROM tb_role_prgrm_map r");
            s.executeUpdate("UPDATE tb_user_info SET rrno='synthetic-ciphertext' WHERE user_id='webmaster'");
        }
        try (Connection c=openConnection(); Statement s=c.createStatement()) {
            c.setAutoCommit(false);
            s.execute("LOCK TABLE tb_menu_info IN ACCESS EXCLUSIVE MODE");
            assertThatThrownBy(() -> migrate("2.94")).isInstanceOf(FlywayException.class);
            c.rollback();
        }
        migrate("2.94");
        try (Connection c=openConnection(); Statement s=c.createStatement()) {
            assertThat(text(s,"SELECT user_enrrno FROM tb_user_info WHERE user_id='webmaster'")).isEqualTo("synthetic-ciphertext");
            s.executeUpdate("UPDATE tb_user_info SET rrno='old-writer-ciphertext' WHERE user_id='webmaster'");
            assertThat(text(s,"SELECT user_enrrno FROM tb_user_info WHERE user_id='webmaster'")).isEqualTo("old-writer-ciphertext");
            s.executeUpdate("UPDATE tb_user_info SET user_enrrno='new-writer-ciphertext' WHERE user_id='webmaster'");
            assertThat(text(s,"SELECT rrno FROM tb_user_info WHERE user_id='webmaster'")).isEqualTo("new-writer-ciphertext");
            assertThatThrownBy(() -> s.executeUpdate("UPDATE tb_user_info SET rrno='one',user_enrrno='two' WHERE user_id='webmaster'"))
                    .isInstanceOf(SQLException.class);
            s.executeUpdate("INSERT INTO tb_inst_cd(inst_cd,chg_tm) VALUES ('TST0001','240000')");
        }
        assertThatThrownBy(() -> migrate("2.95")).isInstanceOf(FlywayException.class);
        try (Connection c=openConnection(); Statement s=c.createStatement()) {
            assertThat(text(s,"SELECT chg_tm FROM tb_inst_cd WHERE inst_cd='TST0001'")).isEqualTo("240000");
            s.executeUpdate("UPDATE tb_inst_cd SET chg_tm='235959' WHERE inst_cd='TST0001'");
            s.executeUpdate("INSERT INTO tb_menu_info(menu_nm,menu_ordr,prgrm_file_nm) VALUES ('unresolved',999,'UNKNOWN_LEGACY')");
        }
        assertThatThrownBy(() -> migrate("2.95")).isInstanceOf(FlywayException.class);
        try (Connection c=openConnection(); Statement s=c.createStatement()) {
            assertThat(number(s,"SELECT count(*) FROM tb_menu_info WHERE prgrm_file_nm='UNKNOWN_LEGACY'")).isEqualTo(1);
            s.executeUpdate("DELETE FROM tb_menu_info WHERE prgrm_file_nm='UNKNOWN_LEGACY'");
        }
        migrate("2.95");
        try (Connection c=openConnection(); Statement s=c.createStatement()) {
            assertThat(text(s,"SELECT md5(string_agg((to_jsonb(m)-'prgrm_file_nm')::text,'|' ORDER BY menu_sn)) FROM tb_menu_info m")).isEqualTo(menusBefore);
            assertThat(text(s,"SELECT md5(string_agg(to_jsonb(r)::text,'|' ORDER BY role_id,prgrm_file_nm)) FROM tb_role_prgrm_map r")).isEqualTo(rolesBefore);
            assertThat(number(s,"SELECT count(*) FROM tb_menu_info m LEFT JOIN tb_prgrm_lst p USING(prgrm_file_nm) WHERE m.prgrm_file_nm IS NOT NULL AND p.prgrm_file_nm IS NULL")).isZero();
            for (String invalid: java.util.List.of("240000","126000","125960","14:30:25","")) {
                assertThatThrownBy(() -> s.executeUpdate("UPDATE tb_inst_cd SET chg_tm='"+invalid+"' WHERE inst_cd='TST0001'"))
                        .isInstanceOf(SQLException.class);
            }
            // 최악의 멀티바이트 300자 PK/복합 PK/FK를 실제 PostgreSQL 인덱스에서 검증한다.
            s.executeUpdate("INSERT INTO tb_prgrm_lst(prgrm_file_nm) VALUES (repeat('가',300))");
            s.executeUpdate("INSERT INTO tb_role_prgrm_map(role_id,prgrm_file_nm) SELECT role_id,repeat('가',300) FROM tb_role_info ORDER BY role_id LIMIT 1");
            s.executeUpdate("INSERT INTO tb_menu_info(menu_nm,menu_ordr,prgrm_file_nm) VALUES ('long key',999,repeat('가',300))");
            assertThatThrownBy(() -> s.executeUpdate("DELETE FROM tb_prgrm_lst WHERE prgrm_file_nm=repeat('가',300)"))
                    .isInstanceOf(SQLException.class);
        }
        migrate("2.96");
        try (Connection c=openConnection(); Statement s=c.createStatement()) {
            assertThat(number(s,"SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='tb_user_info' AND column_name='rrno'")).isZero();
            assertThat(text(s,"SELECT user_enrrno FROM tb_user_info WHERE user_id='webmaster'")).isEqualTo("new-writer-ciphertext");
            assertThat(number(s,"SELECT character_maximum_length FROM information_schema.columns WHERE table_schema='public' AND table_name='tb_user_info' AND column_name='user_enrrno'")).isEqualTo(256);
            assertThat(number(s,"SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('tb_inst_cd','tb_inst_cd_rcptn_log') AND column_name='chg_tm' AND character_maximum_length=6")).isEqualTo(2);
            assertThat(text(s,"SELECT chg_tm FROM tb_inst_cd WHERE inst_cd='TST0001'")).isEqualTo("235959");
            assertThat(number(s,"SELECT count(*) FROM pg_constraint WHERE NOT convalidated")).isZero();
        }
    }

    private void migrate(String version) { flyway(MigrationVersion.fromVersion(version)).migrate(); }
    private static String text(Statement s,String sql) throws SQLException {
        try(ResultSet r=s.executeQuery(sql)) { assertThat(r.next()).isTrue(); return r.getString(1); }
    }
    private static long number(Statement s,String sql) throws SQLException { return Long.parseLong(text(s,sql)); }
}
