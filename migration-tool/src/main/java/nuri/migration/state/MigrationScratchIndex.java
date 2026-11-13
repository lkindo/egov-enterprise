package nuri.migration.state;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.lang.ref.Cleaner;
import java.lang.ref.Reference;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.attribute.AclEntry;
import java.nio.file.attribute.AclEntryFlag;
import java.nio.file.attribute.AclEntryPermission;
import java.nio.file.attribute.AclEntryType;
import java.nio.file.attribute.AclFileAttributeView;
import java.nio.file.attribute.PosixFilePermissions;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;

/** Run-local encrypted disk index. It is disposable, never the durable resume authority. */
public final class MigrationScratchIndex implements AutoCloseable {
    private static final Cleaner CLEANER = Cleaner.create();
    private static final Logger LOG = LoggerFactory.getLogger(MigrationScratchIndex.class);
    private final String[] definitions;
    private final Cleanup cleanup = new Cleanup();
    private final Cleaner.Cleanable cleanable = CLEANER.register(this, cleanup);
    private JdbcTemplate jdbc;

    public MigrationScratchIndex(String... definitions) {
        this.definitions = definitions.clone();
    }

    public <T> T access(Function<JdbcTemplate, T> operation) {
        if (cleanup.closed) throw new IllegalStateException("migration scratch index is closed");
        try {
            if (jdbc == null) open();
            return operation.apply(jdbc);
        } catch (DataAccessException failure) {
            // JDBC failures can include bound source keys. Never attach those diagnostics.
            throw new IllegalStateException("migration scratch index operation failed");
        } finally {
            Reference.reachabilityFence(this);
        }
    }

    private void open() {
        try {
            boolean posix = Path.of(System.getProperty("java.io.tmpdir")).getFileSystem()
                    .supportedFileAttributeViews().contains("posix");
            cleanup.directory = posix
                    ? Files.createTempDirectory("migration-index-", PosixFilePermissions.asFileAttribute(
                            PosixFilePermissions.fromString("rwx------")))
                    : Files.createTempDirectory("migration-index-");
            cleanup.directory = cleanup.directory.toRealPath();
            if (!posix) {
                AclFileAttributeView acl = Files.getFileAttributeView(cleanup.directory, AclFileAttributeView.class);
                if (acl == null) throw new IOException("private directory permissions unavailable");
                acl.setAcl(List.of(AclEntry.newBuilder().setType(AclEntryType.ALLOW)
                        .setPrincipal(acl.getOwner()).setPermissions(EnumSet.allOf(AclEntryPermission.class))
                        .setFlags(AclEntryFlag.FILE_INHERIT, AclEntryFlag.DIRECTORY_INHERIT).build()));
            }
            String location = cleanup.directory.resolve("index").toAbsolutePath().toString().replace('\\', '/');
            cleanup.connection = DriverManager.getConnection("jdbc:h2:file:" + location
                            + ";CIPHER=AES;CACHE_SIZE=2048;MAX_MEMORY_ROWS=512;MAX_MEMORY_UNDO=1024"
                            + ";DB_CLOSE_ON_EXIT=FALSE;TRACE_LEVEL_FILE=0;TRACE_LEVEL_SYSTEM_OUT=0",
                    "index", UUID.randomUUID() + " " + UUID.randomUUID());
            jdbc = new JdbcTemplate(new SingleConnectionDataSource(cleanup.connection, true));
            for (String definition : definitions) jdbc.execute(definition);
        } catch (IOException | SQLException | DataAccessException failure) {
            cleanable.clean();
            throw new IllegalStateException("could not initialize private migration scratch index");
        }
    }

    @Override
    public void close() {
        cleanable.clean();
    }

    private static final class Cleanup implements Runnable {
        private Path directory;
        private Connection connection;
        private boolean closed;

        @Override
        public synchronized void run() {
            if (closed) return;
            closed = true;
            boolean failed = false;
            if (connection != null) {
                try { connection.close(); }
                catch (SQLException failure) { failed = true; }
            }
            if (directory == null) return;
            // Only this newly-created directory's known regular files may be removed.
            try {
                if (!directory.isAbsolute() || !Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS)
                        || !directory.toRealPath().equals(directory)) throw new IOException("scratch directory changed");
            } catch (IOException | RuntimeException failure) {
                warn();
                return;
            }
            try (var files = Files.list(directory)) {
                for (Path file : files.toList()) {
                    if (!file.getParent().equals(directory) || !file.getFileName().toString().startsWith("index.")
                            || !Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)) {
                        throw new IOException("unexpected scratch index entry");
                    }
                    deleteWithRetry(file);
                }
            } catch (IOException | RuntimeException failure) { failed = true; }
            try { deleteWithRetry(directory); }
            catch (IOException | RuntimeException failure) { failed = true; }
            if (failed) warn();
        }

        private static void deleteWithRetry(Path path) throws IOException {
            for (int attempt = 0; ; attempt++) {
                try { Files.deleteIfExists(path); return; }
                catch (IOException failure) {
                    if (attempt == 2) throw failure;
                    try { Thread.sleep(25L * (attempt + 1)); }
                    catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                        throw failure;
                    }
                }
            }
        }

        private static void warn() {
            // The durable target result is authoritative; disposal must not discard it.
            LOG.warn("migration scratch index cleanup incomplete; encrypted temporary files may remain");
        }
    }
}
