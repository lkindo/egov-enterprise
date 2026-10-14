package nuri.migration.appscan;

import nuri.migration.appscan.AppUsageReport.FileCounts;
import nuri.migration.artifact.PersonalDataPatterns;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileVisitOption;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/**
 * 레거시 애플리케이션 소스 디렉터리를 읽기 전용으로 훑어 {@link AppUsageReport} 를 만든다(ADR-0029 결정 9).
 *
 * <ul>
 *   <li>심볼릭 링크는 따라가지 않는다. 버전 관리·IDE 디렉터리는 건너뛴다.</li>
 *   <li>설정 파일(properties·yml·env 등)은 내용을 읽지 않는다 — 접속정보·비밀값이 산출물로 가는 경로를 처음부터 없앤다.</li>
 *   <li>압축본은 풀지 않고 {@code PARTIAL}(운영자가 별도 디렉터리에 풀어 다시 스캔한다)이다. Java 소스 없이
 *       class·jar 만 있으면 {@code PARTIAL} 이다.</li>
 *   <li>UTF-8 로 읽지 못하면 MS949 로 읽는다. 둘 다 아니면 {@code PARTIAL} 이다.</li>
 * </ul>
 */
public final class AppSourceScanner {

    static final long MAX_FILE_BYTES = 4L * 1024 * 1024;
    private static final Set<String> SKIPPED_DIRECTORIES = Set.of(".git", ".svn", ".hg", ".idea", ".vscode",
            "node_modules", ".gradle");
    private static final Set<String> CONFIG = Set.of("properties", "yml", "yaml", "env", "conf", "cfg", "ini",
            "toml", "jks", "keystore", "p12", "pem", "key");
    private static final Set<String> BINARY = Set.of("class", "jar", "dll", "so", "exe");
    private static final Set<String> ARCHIVE = Set.of("zip", "war", "ear", "tar", "gz", "tgz", "7z", "rar");
    private static final Set<String> SCREEN = Set.of("jsp", "jspf", "tag", "html", "htm");

    public AppUsageReport scan(Path sourceRoot) throws IOException {
        Objects.requireNonNull(sourceRoot, "sourceRoot");
        Path root = sourceRoot.toRealPath();
        if (!Files.isDirectory(root, LinkOption.NOFOLLOW_LINKS)) {
            throw new IllegalArgumentException("app-scan 입력은 디렉터리여야 합니다");
        }
        UsageCollector collector = new UsageCollector();
        Counter counter = new Counter();
        XmlSourceReader xml = new XmlSourceReader(collector);
        JavaSourceReader java = new JavaSourceReader(collector);
        ScreenSourceReader screens = new ScreenSourceReader(collector);
        SqlUsageExtractor sql = new SqlUsageExtractor(collector);

        Files.walkFileTree(root, EnumSet.noneOf(FileVisitOption.class), Integer.MAX_VALUE,
                new SimpleFileVisitor<>() {
                    @Override
                    public FileVisitResult preVisitDirectory(Path directory, BasicFileAttributes attributes) {
                        if (!directory.equals(root)
                                && SKIPPED_DIRECTORIES.contains(directory.getFileName().toString())) {
                            return FileVisitResult.SKIP_SUBTREE;
                        }
                        return FileVisitResult.CONTINUE;
                    }

                    @Override
                    public FileVisitResult visitFile(Path file, BasicFileAttributes attributes) throws IOException {
                        if (attributes.isSymbolicLink() || !attributes.isRegularFile()) {
                            counter.symlinksSkipped++;
                            return FileVisitResult.CONTINUE;
                        }
                        counter.scanned++;
                        visit(file, relative(root, file), attributes.size(), counter, collector, xml, java, screens,
                                sql);
                        return FileVisitResult.CONTINUE;
                    }

                    @Override
                    public FileVisitResult visitFileFailed(Path file, IOException failure) {
                        collector.partial(relative(root, file), "UNREADABLE");
                        return FileVisitResult.CONTINUE;
                    }
                });
        if (counter.javaSources == 0 && counter.binaries > 0) {
            collector.partial(".", "BUILD_OUTPUT_WITHOUT_SOURCE");
        }
        return collector.report(new FileCounts(counter.scanned, counter.sqlMappers, counter.sqlScripts,
                counter.javaSources, counter.screens, counter.xmlOther, counter.configNotRead, counter.binaries,
                counter.archives, counter.symlinksSkipped, counter.other));
    }

    private static void visit(Path file, String path, long size, Counter counter, UsageCollector collector,
                              XmlSourceReader xml, JavaSourceReader java, ScreenSourceReader screens,
                              SqlUsageExtractor sql) throws IOException {
        String extension = extension(file);
        if (CONFIG.contains(extension) || file.getFileName().toString().startsWith(".env")) {
            counter.configNotRead++;
            return;
        }
        if (BINARY.contains(extension)) {
            counter.binaries++;
            return;
        }
        if (ARCHIVE.contains(extension)) {
            counter.archives++;
            collector.partial(path, "ARCHIVE_NOT_EXTRACTED");
            return;
        }
        boolean source = extension.equals("xml") || extension.equals("java") || extension.equals("sql")
                || SCREEN.contains(extension);
        if (!source) {
            counter.other++;
            return;
        }
        if (size > MAX_FILE_BYTES) {
            collector.partial(path, "TOO_LARGE");
            return;
        }
        String text = decode(Files.readAllBytes(file));
        if (text == null) {
            collector.partial(path, "UNDECODABLE");
            return;
        }
        switch (extension) {
            case "xml" -> {
                XmlSourceReader.Kind kind = xml.read(text, path);
                if (kind == XmlSourceReader.Kind.SQL_MAPPER) {
                    counter.sqlMappers++;
                } else {
                    counter.xmlOther++;
                }
            }
            case "java" -> {
                counter.javaSources++;
                java.read(text, path);
            }
            case "sql" -> {
                counter.sqlScripts++;
                for (int[] range : statements(text)) {
                    sql.extract(text.substring(range[0], range[1]), path, SourceText.lineOf(text, range[0]));
                }
            }
            default -> {
                counter.screens++;
                screens.read(text, path);
            }
        }
    }

    /** SQL 스크립트를 세미콜론으로 나눈 각 문의 시작·끝 위치. 문자열 안의 세미콜론은 나누지 않는다. */
    private static List<int[]> statements(String text) {
        List<int[]> statements = new ArrayList<>();
        boolean quoted = false;
        int start = 0;
        for (int index = 0; index < text.length(); index++) {
            char current = text.charAt(index);
            if (current == '\'') {
                quoted = !quoted;
            } else if (current == ';' && !quoted) {
                statements.add(new int[] {start, index});
                start = index + 1;
            }
        }
        if (start < text.length() && !text.substring(start).isBlank()) {
            statements.add(new int[] {start, text.length()});
        }
        return statements;
    }

    /** UTF-8(BOM 포함)로 엄격하게 읽고, 안 되면 MS949 로 읽는다. 둘 다 안 되면 {@code null}. */
    static String decode(byte[] bytes) {
        int offset = bytes.length >= 3 && (bytes[0] & 0xff) == 0xef && (bytes[1] & 0xff) == 0xbb
                && (bytes[2] & 0xff) == 0xbf ? 3 : 0;
        String utf8 = strict(StandardCharsets.UTF_8, bytes, offset);
        if (utf8 != null) {
            return utf8;
        }
        return Charset.isSupported("MS949") ? strict(Charset.forName("MS949"), bytes, 0) : null;
    }

    private static String strict(Charset charset, byte[] bytes, int offset) {
        try {
            return charset.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes, offset, bytes.length - offset))
                    .toString();
        } catch (CharacterCodingException failure) {
            return null;
        }
    }

    private static String extension(Path file) {
        String name = file.getFileName().toString().toLowerCase(Locale.ROOT);
        int dot = name.lastIndexOf('.');
        return dot >= 0 ? name.substring(dot + 1) : "";
    }

    /** 루트 아래 상대 경로({@code /} 구분). 개인정보로 보이는 부분은 가린다. */
    private static String relative(Path root, Path file) {
        String relative = root.relativize(file).toString().replace('\\', '/');
        return PersonalDataPatterns.redact(relative.isEmpty() ? "." : relative);
    }

    private static final class Counter {
        long scanned;
        long sqlMappers;
        long sqlScripts;
        long javaSources;
        long screens;
        long xmlOther;
        long configNotRead;
        long binaries;
        long archives;
        long symlinksSkipped;
        long other;
    }
}
