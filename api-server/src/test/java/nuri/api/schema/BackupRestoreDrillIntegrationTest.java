package nuri.api.schema;

import com.fasterxml.jackson.databind.ObjectMapper;
import nuri.foundation.core.config.ProjectCryptoConfig;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.images.builder.Transferable;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/** 실제 pg_dump/pg_restore와 독립 PostgreSQL 17 서버로 수행하는 합성 데이터 복구 훈련. */
@Tag("schema-validation")
@Testcontainers
class BackupRestoreDrillIntegrationTest {
    @Container static final PostgreSQLContainer<?> SOURCE = new PostgreSQLContainer<>("postgres:17-alpine");
    @Container static final PostgreSQLContainer<?> RESTORED = new PostgreSQLContainer<>("postgres:17-alpine");

    @Test
    void restoresFullMigratedDatabaseAttachmentsAndMatchingEncryptionKey() throws Exception {
        Flyway.configure().dataSource(SOURCE.getJdbcUrl(), SOURCE.getUsername(), SOURCE.getPassword())
                .locations("classpath:db/migration").load().migrate();
        String key = UUID.randomUUID().toString();
        ProjectCryptoConfig configuration = new ProjectCryptoConfig();
        ReflectionTestUtils.setField(configuration, "algorithmKey", key);
        var crypto = configuration.cryptoService();
        byte[] plain = "synthetic-restore-probe".getBytes(StandardCharsets.UTF_8);
        String encrypted = Base64.getEncoder().encodeToString(crypto.encrypt(plain, key));
        byte[] attachment = "synthetic attachment content".getBytes(StandardCharsets.UTF_8);
        long attachmentId;
        Map<String, Long> before;
        try (Connection source = open(SOURCE); var statement = source.createStatement()) {
            try (var rows = statement.executeQuery("INSERT INTO tb_file_master (use_yn) VALUES ('Y') RETURNING atch_file_sn")) {
                assertThat(rows.next()).isTrue();
                attachmentId = rows.getLong(1);
            }
            try (var insert = source.prepareStatement("""
                    INSERT INTO tb_file_detail
                    (atch_file_sn, atch_file_seq, file_sz, strg_file_nm, orgnl_file_nm, file_strg_path)
                    VALUES (?, 1, ?, 'restore-probe.txt', 'restore-probe.txt', '/tmp/drill-attachments')
                    """)) {
                insert.setLong(1, attachmentId);
                insert.setLong(2, attachment.length);
                assertThat(insert.executeUpdate()).isEqualTo(1);
            }
            try (var update = source.prepareStatement("""
                    UPDATE tb_user_info SET rrno=?
                    WHERE esntl_id=(SELECT esntl_id FROM tb_user_info ORDER BY esntl_id LIMIT 1)
                    """)) {
                update.setString(1, encrypted);
                assertThat(update.executeUpdate()).isEqualTo(1);
            }
            before = tableCounts(source);
        }
        SOURCE.execInContainer("mkdir", "-p", "/tmp/drill-attachments");
        SOURCE.copyFileToContainer(Transferable.of(attachment), "/tmp/drill-attachments/restore-probe.txt");
        long backupStart = System.nanoTime();
        checked(SOURCE, "pg_dump", "-U", SOURCE.getUsername(), "-d", SOURCE.getDatabaseName(),
                "--format=custom", "--no-owner", "--no-privileges", "--file=/tmp/drill.dump");
        checked(SOURCE, "tar", "-cf", "/tmp/attachments.tar", "-C", "/tmp/drill-attachments", ".");
        long backupMillis = (System.nanoTime() - backupStart) / 1_000_000;
        Path directory = Files.createTempDirectory("egov-restore-drill-");
        Path dump = directory.resolve("database.dump");
        Path archive = directory.resolve("attachments.tar");
        try {
            SOURCE.copyFileFromContainer("/tmp/drill.dump", dump.toString());
            SOURCE.copyFileFromContainer("/tmp/attachments.tar", archive.toString());
            long restoreStart = System.nanoTime();
            RESTORED.copyFileToContainer(org.testcontainers.utility.MountableFile.forHostPath(dump), "/tmp/drill.dump");
            RESTORED.copyFileToContainer(org.testcontainers.utility.MountableFile.forHostPath(archive), "/tmp/attachments.tar");
            checked(RESTORED, "pg_restore", "-U", RESTORED.getUsername(), "-d", RESTORED.getDatabaseName(),
                    "--exit-on-error", "--no-owner", "--no-privileges", "/tmp/drill.dump");
            checked(RESTORED, "mkdir", "-p", "/tmp/drill-attachments");
            checked(RESTORED, "tar", "-xf", "/tmp/attachments.tar", "-C", "/tmp/drill-attachments");
            try (Connection restored = open(RESTORED); var statement = restored.createStatement()) {
                assertThat(tableCounts(restored)).isEqualTo(before);
                try (var rows = statement.executeQuery("SELECT rrno FROM tb_user_info ORDER BY esntl_id LIMIT 1")) {
                    assertThat(rows.next()).isTrue();
                    assertThat(crypto.decrypt(Base64.getDecoder().decode(rows.getString(1)), key)).isEqualTo(plain);
                    assertThatThrownBy(() -> crypto.decrypt(Base64.getDecoder().decode(rows.getString(1)), "wrong-key"))
                            .isInstanceOf(Exception.class);
                }
                try (var rows = statement.executeQuery("SELECT count(*) FROM tb_file_detail d JOIN tb_file_master m "
                        + "USING (atch_file_sn) WHERE d.atch_file_sn=" + attachmentId)) {
                    assertThat(rows.next()).isTrue();
                    assertThat(rows.getLong(1)).isEqualTo(1);
                }
                try (var rows = statement.executeQuery("SELECT count(*) FROM pg_constraint WHERE NOT convalidated")) {
                    assertThat(rows.next()).isTrue();
                    assertThat(rows.getLong(1)).isZero();
                }
            }
            byte[] restoredFile = RESTORED.copyFileFromContainer("/tmp/drill-attachments/restore-probe.txt", input -> input.readAllBytes());
            assertThat(restoredFile).isEqualTo(attachment);
            long restoreMillis = (System.nanoTime() - restoreStart) / 1_000_000;
            Path report = Path.of("build/reports/restore-drill/result.json");
            Files.createDirectories(report.getParent());
            new ObjectMapper().writerWithDefaultPrettyPrinter().writeValue(report.toFile(), Map.of(
                    "schemaVersion", 1, "checkedAt", Instant.now().toString(), "status", "PASS",
                    "scope", "isolated PostgreSQL 17; full Flyway schema; synthetic attachment and ARIA key",
                    "backupMillis", backupMillis, "restoreAndVerificationMillis", restoreMillis,
                    "tablesCompared", before.size(), "rowsCompared", before.values().stream().mapToLong(Long::longValue).sum(),
                    "snapshotDataLossRows", 0, "productionRtoRpoProven", false));
        } finally {
            Files.deleteIfExists(dump);
            Files.deleteIfExists(archive);
            Files.deleteIfExists(directory);
        }
    }

    private static Connection open(PostgreSQLContainer<?> container) throws Exception {
        return DriverManager.getConnection(container.getJdbcUrl(), container.getUsername(), container.getPassword());
    }
    private static void checked(PostgreSQLContainer<?> container, String... command) throws Exception {
        assertThat(container.execInContainer(command).getExitCode()).as("isolated backup/restore command").isZero();
    }
    private static Map<String, Long> tableCounts(Connection connection) throws Exception {
        Map<String, Long> counts = new LinkedHashMap<>();
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(
                "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")) {
            while (rows.next()) {
                String table = rows.getString(1);
                assertThat(table).matches("[a-z][a-z0-9_]*");
                try (var counter = connection.createStatement(); var count = counter.executeQuery("SELECT count(*) FROM \"" + table + "\"")) {
                    count.next();
                    counts.put(table, count.getLong(1));
                }
            }
        }
        return counts;
    }
}
