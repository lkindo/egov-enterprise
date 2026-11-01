package nuri.api.schema;

import nuri.business.service.file.AttachmentReferenceIntegrityService;
import nuri.business.service.file.AttachmentSource;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
class AttachmentReferenceIntegrityPostgresTest extends SharedPostgresMigrationTestSupport {
    private static final String VENDOR_FIXTURE = "첨부 점검 시험";
    private static final String VENDOR_BOARD = "T_ATCH_SCAN";

    private static AttachmentReferenceIntegrityService scanner(java.sql.Connection connection) {
        return new AttachmentReferenceIntegrityService(new SingleConnectionDataSource(connection, true),
                List.of(() -> List.of(AttachmentSource.BOARD, AttachmentSource.POPUP, AttachmentSource.DATA_USE_STATS)),
                VendorTestSql.dialect(VendorTestSql.on(connection)));
    }

    /** 벤더 DB 는 실제 표라 첨부 번호 FK 가 끊어진 숫자 참조를 막고 다른 시험의 행도 있다. 끊긴 참조는 URL 로 만들고 늘어난 만큼 본다. */
    private void scanRealTables(java.sql.Connection connection) {
        var jdbc = VendorTestSql.on(connection);
        var scanner = scanner(connection);
        var before = scanner.scan(100_000);
        long file = VendorTestSql.insertKey(jdbc, "INSERT INTO tb_file_master (use_yn) VALUES ('Y')", "atch_file_sn");
        try {
            jdbc.update("INSERT INTO tb_bbs_master (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, use_yn, file_atch_psblty_yn, atch_psblty_file_qty)"
                    + " VALUES (?, ?, 'BBST01', 'BBSA01', 'Y', 'N', 0)", VENDOR_BOARD, VENDOR_FIXTURE);
            jdbc.update("INSERT INTO tb_bbs_item (bbs_id, atch_file_sn) VALUES (?, ?)", VENDOR_BOARD, file);
            jdbc.update("INSERT INTO tb_bbs_item (bbs_id) VALUES (?)", VENDOR_BOARD);
            List<String> urls = List.of("/api/v1/files/" + file, "/api/v1/files/download?fileId=" + (file + 1_000_000),
                    "https://example.invalid/image.png");
            for (String url : urls) {
                jdbc.update("INSERT INTO tb_popup_info (popup_ttl_nm, file_url) VALUES (?, ?)", VENDOR_FIXTURE, url);
            }
            var result = scanner.scan(100_000);
            assertThat(result.complete()).isTrue();
            assertThat(result.checked()).as("숫자 참조 1건, URL 참조 2건").isEqualTo(before.checked() + 3);
            assertThat(result.dangling()).isEqualTo(before.dangling() + 1);
            assertThat(result.sourcesChecked()).isEqualTo(2);
            assertThat(scanner.scan(1).complete()).isFalse();
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM tb_bbs_item WHERE bbs_id = ?", Integer.class, VENDOR_BOARD)).isEqualTo(2);
            assertThat(jdbc.queryForList("SELECT file_url FROM tb_popup_info WHERE popup_ttl_nm = ?", String.class, VENDOR_FIXTURE))
                    .containsExactlyInAnyOrderElementsOf(urls);
        } finally {
            jdbc.update("DELETE FROM tb_popup_info WHERE popup_ttl_nm = ?", VENDOR_FIXTURE);
            jdbc.update("DELETE FROM tb_bbs_item WHERE bbs_id = ?", VENDOR_BOARD);
            jdbc.update("DELETE FROM tb_bbs_master WHERE bbs_id = ?", VENDOR_BOARD);
            jdbc.update("DELETE FROM tb_file_master WHERE atch_file_sn = ?", file);
        }
    }

    @Test
    void detectsNumericAndUrlReferencesWithoutChangingRowsAndReportsLimits() throws Exception {
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            if (VendorTestSql.vendorRun()) {
                scanRealTables(connection);
                return;
            }
            statement.execute("CREATE TABLE tb_file_master (atch_file_sn bigint PRIMARY KEY)");
            statement.execute("CREATE TABLE tb_bbs_item (atch_file_sn bigint)");
            statement.execute("CREATE TABLE tb_popup_info (file_url varchar(1000))");
            statement.execute("INSERT INTO tb_file_master VALUES (1)");
            statement.execute("INSERT INTO tb_bbs_item VALUES (1), (2), (NULL)");
            statement.execute("INSERT INTO tb_popup_info VALUES ('/api/v1/files/1'), ('/api/v1/files/download?fileId=2'), ('https://example.invalid/image.png')");
            var scanner = scanner(connection);
            var result = scanner.scan(100);
            assertThat(result.complete()).isTrue();
            assertThat(result.checked()).isEqualTo(4);
            assertThat(result.dangling()).isEqualTo(2);
            assertThat(result.sourcesChecked()).isEqualTo(2);
            assertThat(scanner.scan(1).complete()).isFalse();
            try (var count = statement.executeQuery("SELECT (SELECT COUNT(*) FROM tb_bbs_item) + (SELECT COUNT(*) FROM tb_popup_info)")) {
                assertThat(count.next()).isTrue();
                assertThat(count.getInt(1)).isEqualTo(6);
            }
        }
    }
}
