package nuri.migration.state;

import nuri.migration.keymap.KeyMapRegistry;
import nuri.migration.etl.EtlExecutor;
import nuri.migration.mapping.MappingIndex;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.IdStrategy;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.TransformerRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Types;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class BoundedMigrationStateTest {
    @TempDir Path directory;

    @Test
    void checkpointAndKeyMapIdentityRemainExactBeyondTheAvailableHeap() throws Exception {
        String classpath = System.getProperty("migration.drill.classpath");
        assertThat(classpath).isNotBlank();
        Path arguments = directory.resolve("bounded-state.args");
        Path log = directory.resolve("bounded-state.log");
        Path scratch = Files.createDirectory(directory.resolve("scratch"));
        Files.writeString(arguments, "-cp\n\"" + classpath.replace('\\', '/') + "\"\n"
                + Worker.class.getName() + "\n");
        String executable = System.getProperty("os.name").startsWith("Windows") ? "java.exe" : "java";
        Process worker = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", executable).toString(),
                "-Xmx64m", "-Djava.io.tmpdir=" + scratch, "@" + arguments)
                .redirectErrorStream(true).redirectOutput(log.toFile()).start();
        try {
            // The heap/data invariant is fixed; allow slower CI disks and CPUs to finish it.
            assertThat(worker.waitFor(600, TimeUnit.SECONDS)).as("bounded-state worker terminates").isTrue();
            assertThat(worker.exitValue()).withFailMessage("Bounded-state worker failed: %s", Files.readString(log)).isZero();
            assertThat(Files.readString(log)).contains("BOUNDED_STATE_PASS");
            try (var remaining = Files.list(scratch)) {
                assertThat(remaining.toList()).as("run-local indexes are removed on close").isEmpty();
            }
        } finally {
            if (worker.isAlive()) worker.destroyForcibly().waitFor(15, TimeUnit.SECONDS);
        }
    }

    public static final class Worker {
        private static final int ROWS = 220_000;

        public static void main(String[] ignored) throws Exception {
            KeyMapRegistry registry = new KeyMapRegistry();
            MigrationStateStore state = new MigrationStateStore(new RunContext("heap-run", "heap-source"));
            try {
                var pending = registry.checkpoint();
                for (int i = 0; i < ROWS; i++) {
                    String source = source(i);
                    String target = registry.mintOrGet("legacy_user", source, "USR");
                    state.accept(List.of(new MigrationStateStore.CheckpointEntry(
                            "legacy_user", source, "tb_user", target, "sum-" + i)));
                    if ((i + 1) % 500 == 0) {
                        registry.accept(pending);
                        pending = registry.checkpoint();
                    }
                }
                if (registry.hasPending() || state.count("legacy_user", "") != ROWS) throw new AssertionError("count");
                for (int i : new int[]{0, 10_001, ROWS - 1}) {
                    var checkpoint = state.find("legacy_user", "", source(i));
                    if (checkpoint == null || !checkpoint.targetKey().equals(registry.translate("legacy_user", source(i)))) {
                        throw new AssertionError("identity");
                    }
                }
                var reservation = registry.checkpoint();
                for (int i = 0; i < ROWS; i++) registry.mintOrGet("reserved_parent", source(i), "DEP");
                registry.rollback(reservation);
                if (registry.hasMappingFor("reserved_parent") || registry.hasPending()) throw new AssertionError("rollback");
                if (!registry.hasMappingFor("legacy_user")) throw new AssertionError("committed identities lost");
                System.out.println("SELF_REFERENCE_PHASE");
                preMintSelfReference(registry);
                if (registry.hasPending() || registry.translate("reserved_parent", source(ROWS - 1)) == null) {
                    throw new AssertionError("self-reference reservation");
                }
                System.out.println("BOUNDED_STATE_PASS");
            } finally {
                closeIfSupported(state);
                closeIfSupported(registry);
            }
        }

        private static String source(int i) { return "legacy-" + i + "-" + "x".repeat(200); }

        private static void preMintSelfReference(KeyMapRegistry registry) throws Exception {
            int[] ordinal = {-1};
            ResultSetMetaData columns = proxy(ResultSetMetaData.class, (_proxy, method, _args) -> {
                if (method.getName().equals("getColumnType")) return Types.VARCHAR;
                throw new AssertionError(method.getName());
            });
            ResultSet rows = proxy(ResultSet.class, (_proxy, method, _args) -> switch (method.getName()) {
                case "next" -> ++ordinal[0] < ROWS;
                case "getObject" -> source(ordinal[0]);
                case "getMetaData" -> columns;
                case "close" -> null;
                default -> throw new AssertionError(method.getName());
            });
            PreparedStatement statement = proxy(PreparedStatement.class, (_proxy, method, _args) -> switch (method.getName()) {
                case "executeQuery" -> rows;
                case "close", "setFetchSize" -> null;
                default -> throw new AssertionError(method.getName());
            });
            DatabaseMetaData metadata = proxy(DatabaseMetaData.class, (_proxy, method, _args) -> {
                if (method.getName().equals("getDatabaseProductName")) return "H2";
                throw new AssertionError(method.getName());
            });
            Connection source = proxy(Connection.class, (_proxy, method, _args) -> switch (method.getName()) {
                case "getMetaData" -> metadata;
                case "prepareStatement" -> statement;
                default -> throw new AssertionError(method.getName());
            });
            TableMapping table = new TableMapping("reserved_parent", "tb_parent", null, null,
                    List.of("legacy_key"), "id", List.of(
                    new ColumnMapping("legacy_key", "id", null, "text", null, null, null),
                    new ColumnMapping("parent_key", "parent_id", null, "text", null, "reserved_parent", null)),
                    new IdStrategy("id", "DEP", "legacy_key"));
            var helper = EtlExecutor.class.getDeclaredMethod("preMintSelfReferences", Connection.class,
                    Connection.class, MappingIndex.class, TableMapping.class, KeyMapRegistry.class);
            helper.setAccessible(true);
            try {
                helper.invoke(new EtlExecutor(new SourceIntrospector(), new TransformerRegistry()),
                        source, null, MappingIndex.of(List.of(table)), table, registry);
            } catch (InvocationTargetException failure) {
                if (failure.getCause() instanceof Exception cause) throw cause;
                if (failure.getCause() instanceof Error cause) throw cause;
                throw failure;
            }
        }

        private static <T> T proxy(Class<T> type, InvocationHandler handler) {
            return type.cast(Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler));
        }
        private static void closeIfSupported(Object resource) throws Exception {
            if (resource instanceof AutoCloseable closeable) closeable.close();
        }
    }
}
