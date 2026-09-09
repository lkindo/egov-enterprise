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
    @Test
    void detectsNumericAndUrlReferencesWithoutChangingRowsAndReportsLimits() throws Exception {
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            statement.execute("CREATE TABLE tb_file_master (atch_file_sn bigint PRIMARY KEY)");
            statement.execute("CREATE TABLE tb_bbs_item (atch_file_sn bigint)");
            statement.execute("CREATE TABLE tb_popup_info (file_url varchar(1000))");
            statement.execute("INSERT INTO tb_file_master VALUES (1)");
            statement.execute("INSERT INTO tb_bbs_item VALUES (1), (2), (NULL)");
            statement.execute("INSERT INTO tb_popup_info VALUES ('/api/v1/files/1'), ('/api/v1/files/download?fileId=2'), ('https://example.invalid/image.png')");
            var dataSource = new SingleConnectionDataSource(connection, true);
            var scanner = new AttachmentReferenceIntegrityService(dataSource,
                    List.of(() -> List.of(AttachmentSource.BOARD, AttachmentSource.POPUP, AttachmentSource.DATA_USE_STATS)));
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
