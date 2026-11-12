package nuri.business.service.file;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.storage.StorageObjectMissingException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * [Wave 4] S3 호환 저장소 어댑터. 서명은 AWS 문서의 예제 값과 같아야 하고, 요청 의미(덮어쓰지 않는 저장·부재 구분·멱등 삭제·
 * ETag 결속 지연 삭제·한 단계 목록)는 로컬 저장소 규약과 같아야 한다. 가짜 S3 서버(JDK HttpServer)로 본다 — 네트워크 밖으로 나가지
 * 않는다.
 */
class S3FileStorageServiceTest {

    private HttpServer server;
    private final Map<String, byte[]> objects = new ConcurrentHashMap<>();
    private final List<String> requests = new CopyOnWriteArrayList<>();
    private S3FileStorageService storage;

    @BeforeEach
    void setUp() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handle);
        server.start();
        var settings = new S3FileStorageService.Settings("http://127.0.0.1:" + server.getAddress().getPort(), "ap-northeast-2",
                "egov-files", "AKIDEXAMPLE", "secret-example", "tenant-a", true);
        storage = new S3FileStorageService(settings, HttpClient.newHttpClient(),
                Clock.fixed(Instant.parse("2026-11-12T00:00:00Z"), ZoneOffset.UTC));
    }

    @AfterEach
    void tearDown() {
        server.stop(0);
    }

    @Test
    @DisplayName("서명은 AWS SigV4 문서 예제(GET Object, Range)와 같은 값이다")
    void signatureMatchesTheAwsDocumentedExample() {
        var signer = new S3RequestSigner("AKIAIOSFODNN7EXAMPLE", "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", "us-east-1");
        Map<String, String> headers = signer.sign("GET", "examplebucket.s3.amazonaws.com", "/test.txt", Map.of(),
                Map.of("range", "bytes=0-9"), S3RequestSigner.EMPTY_PAYLOAD_SHA256,
                ZonedDateTime.of(2013, 5, 24, 0, 0, 0, 0, ZoneOffset.UTC));
        assertThat(headers.get("authorization")).isEqualTo("AWS4-HMAC-SHA256 "
                + "Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request,"
                + "SignedHeaders=host;range;x-amz-content-sha256;x-amz-date,"
                + "Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41");
    }

    @Test
    @DisplayName("저장은 UUID 이름으로 덮어쓰지 않게(If-None-Match) 서명해 올리고, 읽기·존재·삭제가 같은 키를 본다")
    void storeReadExistsDelete() throws IOException {
        String saved = storage.store(new MockMultipartFile("file", "보고서.PDF", "application/pdf", "hello".getBytes()), "general/7");

        assertThat(saved).matches("[0-9a-f-]{36}\\.pdf");
        assertThat(requests).anySatisfy(line -> assertThat(line)
                .startsWith("PUT /egov-files/tenant-a/general/7/" + saved).contains("if-none-match=*").contains("auth=AWS4-HMAC-SHA256"));
        assertThat(storage.exists(saved, "general/7")).isTrue();
        try (var in = storage.loadAsResource(saved, "general/7").getInputStream()) {
            assertThat(new String(in.readAllBytes(), StandardCharsets.UTF_8)).isEqualTo("hello");
        }
        assertThat(storage.loadAsResource(saved, "general/7").contentLength()).isEqualTo(5);

        storage.delete(saved, "general/7");
        assertThat(storage.exists(saved, "general/7")).isFalse();
        storage.delete(saved, "general/7");  // 없는 객체 삭제는 멱등이다.
        assertThatThrownBy(() -> storage.loadAsResource(saved, "general/7")).isInstanceOf(StorageObjectMissingException.class);
    }

    @Test
    @DisplayName("같은 키가 이미 있으면(412) 덮어쓰지 않고 실패한다")
    void existingKeyIsNeverOverwritten() {
        objects.put("/egov-files/tenant-a/general/occupied", "old".getBytes());
        server.removeContext("/");
        server.createContext("/", exchange -> {
            if ("PUT".equals(exchange.getRequestMethod())) {
                respond(exchange, 412, new byte[0]);
            } else {
                handle(exchange);
            }
        });
        assertThatThrownBy(() -> storage.store(new MockMultipartFile("file", "a.txt", "text/plain", "new".getBytes()), "general"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("지연 삭제는 잡아 둔 ETag 의 객체만 지우고, 없으면 ABSENT·이미 지워졌으면 끝, 바뀌었으면 지우지 않는다")
    void deferredDeletionIsBoundToTheEtag() {
        String saved = storage.store(new MockMultipartFile("file", "a.txt", "text/plain", "v1".getBytes()), "general");
        String identity = storage.captureDeletionIdentity(saved, "general");
        assertThat(identity).startsWith("etag:");
        assertThat(storage.captureDeletionIdentity("missing.txt", "general")).isEqualTo("ABSENT");

        objects.put("/egov-files/tenant-a/general/" + saved, "v2".getBytes());
        assertThatThrownBy(() -> storage.deleteCaptured(UUID.randomUUID(), saved, "general", identity))
                .as("ETag 가 다르면 다른 객체다 — 지우지 않는다").isInstanceOf(BusinessException.class);
        assertThat(storage.exists(saved, "general")).isTrue();

        String current = storage.captureDeletionIdentity(saved, "general");
        storage.deleteCaptured(UUID.randomUUID(), saved, "general", current);
        assertThat(storage.exists(saved, "general")).isFalse();
        storage.deleteCaptured(UUID.randomUUID(), saved, "general", current);  // 재시도는 멱등이다.
        storage.deleteCaptured(UUID.randomUUID(), saved, "general", "ABSENT");
    }

    @Test
    @DisplayName("목록은 한 단계 아래의 파일·하위 접두를 상대 이름으로 돌려준다(로컬 Files.walk(path, 1) 과 같은 모양)")
    void listsOneLevel() {
        objects.put("/egov-files/tenant-a/general/a.txt", "a".getBytes());
        objects.put("/egov-files/tenant-a/general/b.txt", "b".getBytes());
        objects.put("/egov-files/tenant-a/general/7/c.txt", "c".getBytes());
        objects.put("/egov-files/tenant-a/other/d.txt", "d".getBytes());

        assertThat(storage.loadAll("general").map(Path::toString).sorted().toList()).containsExactly("7", "a.txt", "b.txt");
        assertThat(storage.load("general").toString().replace('\\', '/')).isEqualTo("s3-egov-files/tenant-a/general");
    }

    @Test
    @DisplayName("저장소 밖으로 나가는 경로 조각과 전체 삭제는 받지 않고, 설정이 비면 만들지 않는다")
    void rejectsUnsafeKeysBulkDeleteAndEmptySettings() {
        assertThat(storage.exists("a.txt", "general/../secret")).as("존재 확인은 던지지 않고 없음이다").isFalse();
        assertThatThrownBy(() -> storage.delete("a.txt", "general/../secret")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> storage.delete("../a.txt", "general")).isInstanceOf(BusinessException.class);
        assertThat(requests).as("거부한 키는 저장소에 요청하지 않는다").noneMatch(line -> line.contains(".."));
        assertThatThrownBy(storage::deleteAll).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> new S3FileStorageService.Settings("http://127.0.0.1:9", "r", "egov-files", "", "s", "", true))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new S3FileStorageService.Settings("file:///tmp", "r", "egov-files", "a", "s", "", true))
                .isInstanceOf(IllegalStateException.class);
    }

    // ------------------------------------------------------------------ 가짜 S3

    private void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getRawPath();
        String auth = exchange.getRequestHeaders().getFirst("authorization");
        requests.add(method + " " + path + " if-none-match=" + exchange.getRequestHeaders().getFirst("if-none-match")
                + " auth=" + (auth == null ? "-" : auth.substring(0, Math.min(16, auth.length()))));
        if (auth == null || exchange.getRequestHeaders().getFirst("x-amz-date") == null) {
            respond(exchange, 403, new byte[0]);
            return;
        }
        String query = exchange.getRequestURI().getRawQuery();
        if ("GET".equals(method) && query != null && query.contains("list-type=2")) {
            String prefix = java.net.URLDecoder.decode(query.replaceAll(".*prefix=([^&]*).*", "$1"), StandardCharsets.UTF_8);
            String bucketPrefix = "/egov-files/";
            StringBuilder xml = new StringBuilder("<ListBucketResult><IsTruncated>false</IsTruncated>");
            java.util.Set<String> subs = new java.util.TreeSet<>();
            objects.keySet().stream().sorted().map(key -> key.substring(bucketPrefix.length()))
                    .filter(key -> key.startsWith(prefix)).forEach(key -> {
                        String rest = key.substring(prefix.length());
                        if (rest.contains("/")) subs.add(prefix + rest.substring(0, rest.indexOf('/') + 1));
                        else xml.append("<Contents><Key>").append(key).append("</Key></Contents>");
                    });
            subs.forEach(sub -> xml.append("<CommonPrefixes><Prefix>").append(sub).append("</Prefix></CommonPrefixes>"));
            respond(exchange, 200, xml.append("</ListBucketResult>").toString().getBytes(StandardCharsets.UTF_8));
            return;
        }
        byte[] stored = objects.get(path);
        switch (method) {
            case "PUT" -> {
                if (stored != null && "*".equals(exchange.getRequestHeaders().getFirst("if-none-match"))) {
                    respond(exchange, 412, new byte[0]);
                } else {
                    objects.put(path, exchange.getRequestBody().readAllBytes());
                    respond(exchange, 200, new byte[0]);
                }
            }
            case "HEAD" -> {
                if (stored == null) { respond(exchange, 404, null); return; }
                exchange.getResponseHeaders().add("ETag", "\"" + S3RequestSigner.sha256Hex(stored) + "\"");
                exchange.getResponseHeaders().add("Content-Length", String.valueOf(stored.length));
                exchange.sendResponseHeaders(200, -1);
                exchange.close();
            }
            case "GET" -> respond(exchange, stored == null ? 404 : 200, stored == null ? new byte[0] : stored);
            case "DELETE" -> {
                objects.remove(path);
                respond(exchange, 204, null);
            }
            default -> respond(exchange, 405, new byte[0]);
        }
    }

    private static void respond(HttpExchange exchange, int status, byte[] body) throws IOException {
        if (body == null || body.length == 0) {
            exchange.sendResponseHeaders(status, -1);
        } else {
            exchange.sendResponseHeaders(status, body.length);
            exchange.getResponseBody().write(body);
        }
        exchange.close();
    }
}
