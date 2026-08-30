package nuri.migration.jdbc;

import nuri.migration.artifact.SourceDriverEvidence;

import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.CodeSource;
import java.sql.Driver;

/** application classpath에서 실제 선택될 bundled driver의 code source를 hash한다. */
final class BundledDriverEvidence {

    private BundledDriverEvidence() {}

    static SourceDriverEvidence capture(String driverClassName) {
        if (driverClassName == null || driverClassName.isBlank()) {
            throw SourceDriverException.configuration();
        }
        try {
            ClassLoader loader = effectiveLoader();
            Class<?> driverClass = Class.forName(driverClassName, false, loader);
            if (!Driver.class.isAssignableFrom(driverClass)) {
                throw SourceDriverException.configuration();
            }
            String contentDigest = codeSourceDigest(driverClass, loader, driverClassName);
            return SourceDriverEvidence.bundled(driverClassName, contentDigest);
        } catch (SourceDriverException failure) {
            throw failure;
        } catch (Exception | LinkageError failure) {
            throw SourceDriverException.configuration();
        }
    }

    private static String codeSourceDigest(
            Class<?> driverClass,
            ClassLoader loader,
            String driverClassName
    ) throws Exception {
        CodeSource codeSource = driverClass.getProtectionDomain().getCodeSource();
        URL location = codeSource == null ? null : codeSource.getLocation();
        if (location != null && "file".equalsIgnoreCase(location.getProtocol())) {
            Path candidate = Path.of(location.toURI());
            if (Files.isRegularFile(candidate)) {
                return DriverJarDigests.sha256(candidate);
            }
        }
        String resource = driverClassName.replace('.', '/') + ".class";
        try (InputStream input = loader.getResourceAsStream(resource)) {
            if (input == null) {
                throw SourceDriverException.configuration();
            }
            return DriverJarDigests.sha256(input);
        }
    }

    private static ClassLoader effectiveLoader() {
        ClassLoader context = Thread.currentThread().getContextClassLoader();
        return context == null ? BundledDriverEvidence.class.getClassLoader() : context;
    }
}
