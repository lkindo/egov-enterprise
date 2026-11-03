package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;
import nuri.foundation.core.persistence.VendorSqlDialect.UpsertColumn;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** MariaDB 11.4 의 문장 모양. 두 엔진 공통 모양은 {@link InnoDbSqlDialectContract} 가 본다. */
class MariaDbSqlDialectTest extends InnoDbSqlDialectContract {

    private final MariaDbSqlDialect dialect = new MariaDbSqlDialect();

    @Override
    InnoDbSqlDialect dialect() {
        return dialect;
    }

    @Override
    String expectedLockSql() {
        return "SELECT lock_slot_no FROM tb_sys_lock_slot WHERE lock_slot_no = ? FOR UPDATE WAIT 10";
    }

    /** 2026-11-04 실측한 두 서버의 VERSION(). */
    @Override
    String ownServerVersion() {
        return "11.4.13-MariaDB-ubu2404";
    }

    @Override
    String otherServerVersion() {
        return "8.4.13";
    }

    @Test
    @DisplayName("upsert 는 VALUES(c) 로 새 값을 읽어 더한다 — 행 별칭 문법이 없다")
    void upsertAddsCounters() {
        String sql = dialect.upsertAddingCounters("tb_user_log", "pk_tb_user_log",
                List.of(new UpsertColumn("ocrn_ymd", "ocrnYmd"), new UpsertColumn("srvc_nm", "srvcNm")),
                List.of(new UpsertColumn("crt_cnt", "crtCnt"), new UpsertColumn("inq_cnt", "inqCnt")), "crt_dt", "mdfcn_dt");

        assertThat(sql).isEqualTo("INSERT INTO tb_user_log (ocrn_ymd, srvc_nm, crt_cnt, inq_cnt, crt_dt, mdfcn_dt)"
                + " VALUES (:ocrnYmd, :srvcNm, :crtCnt, :inqCnt, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6))"
                + " ON DUPLICATE KEY UPDATE crt_cnt = COALESCE(tb_user_log.crt_cnt, 0) + VALUES(crt_cnt),"
                + " inq_cnt = COALESCE(tb_user_log.inq_cnt, 0) + VALUES(inq_cnt), mdfcn_dt = CURRENT_TIMESTAMP(6)");
        assertThat(sql).as("충돌 키를 고르는 문법이 없다").doesNotContain("pk_tb_user_log");
    }

    @Test
    @DisplayName("MariaDB 드라이버가 MariaDB 서버에서 돌려주는 제품명으로 기동 때 대조한다")
    void productName() {
        assertThat(dialect.databaseProductName()).isEqualTo("MariaDB");
    }

    @Test
    @DisplayName("오류 번호: CHECK·NOT NULL·기본값 없음·형식은 입력 오류, 대기 초과·교착은 잠금 충돌, 1969 는 시간 초과다")
    void errorCodes() {
        VendorErrorCodes codes = dialect.errorCodes();
        assertThat(codes.invalidValues()).isEqualTo(Set.of(4025, 1048, 1364, 1366));
        assertThat(codes.duplicates()).as("중복·FK 는 SQLState 23000 이 가른다").isEmpty();
        assertThat(codes.lockFailures()).isEqualTo(Set.of(1205, 1213));
        assertThat(codes.cancelled()).isEqualTo(Set.of(1969));
    }
}
