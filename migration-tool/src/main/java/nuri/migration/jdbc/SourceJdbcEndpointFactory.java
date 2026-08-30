package nuri.migration.jdbc;

import nuri.migration.artifact.SourceDriverEvidence;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.source.SourceIntrospector;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;
import java.sql.Driver;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

/** bundled source 또는 명시된 외부 JAR를 단일 lifecycle endpoint로 생성한다. */
@Component
public final class SourceJdbcEndpointFactory {

    private static final Pattern DRIVER_CLASS = Pattern.compile(
            "[A-Za-z_$][A-Za-z0-9_$]*(?:\\.[A-Za-z_$][A-Za-z0-9_$]*)+");

    private final SourceIntrospector introspector;
    private final LocalDriverJarPolicy policy;

    public SourceJdbcEndpointFactory(SourceIntrospector introspector) {
        this(introspector, new LocalDriverJarPolicy());
    }

    SourceJdbcEndpointFactory(SourceIntrospector introspector, LocalDriverJarPolicy policy) {
        this.introspector = Objects.requireNonNull(introspector, "introspector");
        this.policy = Objects.requireNonNull(policy, "policy");
    }

    public SourceJdbcEndpoint open(
            DbConfig config,
            List<Path> driverJars,
            String driverClassOverride
    ) {
        if (config == null || config.url() == null || config.url().isBlank()) {
            throw SourceDriverException.configuration();
        }
        List<Path> jars = driverJars == null ? List.of() : List.copyOf(driverJars);
        if (jars.isEmpty()) {
            if (driverClassOverride != null) {
                throw SourceDriverException.configuration();
            }
            return bundled(config);
        }
        String driverClass = driverClassOverride == null ? config.driver() : driverClassOverride;
        if (driverClass == null || !driverClass.equals(driverClass.trim())
                || !DRIVER_CLASS.matcher(driverClass).matches()) {
            throw SourceDriverException.configuration();
        }
        return isolated(config, jars, driverClass);
    }

    private SourceJdbcEndpoint bundled(DbConfig config) {
        try {
            JdbcTemplate jdbc = introspector.jdbc(config);
            DataSource dataSource = jdbc == null ? null : jdbc.getDataSource();
            if (dataSource == null) {
                throw SourceDriverException.configuration();
            }
            return new BundledSourceJdbcEndpoint(
                    jdbc, dataSource, BundledDriverEvidence.capture(config.driver()));
        } catch (SourceDriverException failure) {
            throw failure;
        } catch (RuntimeException failure) {
            throw SourceDriverException.configuration();
        }
    }

    private SourceJdbcEndpoint isolated(DbConfig config, List<Path> jars, String driverClass) {
        List<ValidatedDriverJar> validated = policy.validate(jars);
        SourceDriverEvidence evidence = SourceDriverEvidence.isolated(
                driverClass, validated.stream().map(ValidatedDriverJar::sha256).toList());
        StagedDriverJars staged = StagedDriverJars.stage(validated);
        URLClassLoader loader = null;
        try {
            URL[] urls = staged.jars().stream().map(SourceJdbcEndpointFactory::url).toArray(URL[]::new);
            loader = new URLClassLoader(urls, ClassLoader.getPlatformClassLoader());
            Driver driver = instantiate(driverClass, loader);
            if (!withContextLoader(loader, () -> driver.acceptsURL(config.url()))) {
                throw SourceDriverException.loading();
            }
            ExternalDriverDataSource dataSource = new ExternalDriverDataSource(
                    driver, loader, config.url(), config.username(), config.password());
            return new IsolatedSourceJdbcEndpoint(
                    new JdbcTemplate(dataSource), dataSource, evidence, loader, staged);
        } catch (SourceDriverException failure) {
            closeAfterFailure(loader, staged);
            throw failure;
        } catch (Throwable failure) {
            closeAfterFailure(loader, staged);
            JvmFailureBoundary.rethrowIfFatal(failure);
            throw SourceDriverException.loading();
        }
    }

    private static Driver instantiate(String className, URLClassLoader loader) throws Exception {
        Object instance = withContextLoader(loader, () -> Class.forName(className, true, loader)
                .getDeclaredConstructor().newInstance());
        if (!(instance instanceof Driver driver)) {
            throw SourceDriverException.loading();
        }
        return driver;
    }

    private static URL url(Path path) {
        try {
            return path.toUri().toURL();
        } catch (Exception failure) {
            throw SourceDriverException.loading();
        }
    }

    private static <T> T withContextLoader(ClassLoader loader, CheckedSupplier<T> action)
            throws Exception {
        Thread thread = Thread.currentThread();
        ClassLoader previous = thread.getContextClassLoader();
        try {
            thread.setContextClassLoader(loader);
            return action.get();
        } finally {
            thread.setContextClassLoader(previous);
        }
    }

    private static void closeAfterFailure(URLClassLoader loader, StagedDriverJars staged) {
        Throwable fatal = null;
        if (loader != null) {
            try {
                loader.close();
            } catch (Throwable failure) {
                // The public failure stays fixed and cause-free.
                if (JvmFailureBoundary.isFatal(failure)) {
                    fatal = failure;
                }
            }
        }
        try {
            staged.close();
        } catch (Throwable failure) {
            // The public failure stays fixed and cause-free.
            if (fatal == null && JvmFailureBoundary.isFatal(failure)) {
                fatal = failure;
            }
        }
        if (fatal != null) {
            JvmFailureBoundary.rethrowIfFatal(fatal);
        }
    }

    @FunctionalInterface
    private interface CheckedSupplier<T> {
        T get() throws Exception;
    }
}
