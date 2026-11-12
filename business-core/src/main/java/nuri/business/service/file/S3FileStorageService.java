package nuri.business.service.file;

import lombok.extern.slf4j.Slf4j;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.storage.FileStorageService;
import nuri.foundation.core.storage.StorageObjectMissingException;
import org.springframework.core.io.AbstractResource;
import org.springframework.core.io.Resource;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * S3 호환 오브젝트 저장소 어댑터(Wave 4). {@code file.storage.type=s3} 일 때만 빈이 된다 — 기본은 로컬 파일 저장소다
 * ({@link LocalFileStorageService}). AWS S3·MinIO 같은 S3 API 호환 저장소에 SigV4 로 서명한 HTTP 요청만 보낸다(SDK 없음).
 *
 * <p>규약은 로컬 저장소와 같다: 저장 이름은 UUID 이고 같은 키를 덮어쓰지 않는다({@code If-None-Match: *}). 실물 부재는
 * {@link StorageObjectMissingException}, 존재 확인은 예외를 던지지 않는다. 지연 삭제의 식별은 ETag 다 — 저장 키는 다시 쓰이지
 * 않으므로 ETag 가 같을 때만 지운다. 전체 삭제({@link #deleteAll()})는 운영 저장소에서 받지 않는다.
 *
 * <p>{@code @Service} 가 아니다 — 프로필 설정({@code S3FileStorageConfiguration})이 조건부 빈으로 만든다.
 */
@Slf4j
public class S3FileStorageService implements FileStorageService {

    /** 설정. endpoint 는 {@code https://host[:port]} 이고, pathStyle 이면 {@code endpoint/bucket/key} 로 부른다. */
    public record Settings(String endpoint, String region, String bucket, String accessKey, String secretKey,
                           String prefix, boolean pathStyle) {
        public Settings {
            if (!StringUtils.hasText(endpoint) || !StringUtils.hasText(region) || !StringUtils.hasText(bucket)
                    || !StringUtils.hasText(accessKey) || !StringUtils.hasText(secretKey)) {
                throw new IllegalStateException("S3 저장소 설정(endpoint·region·bucket·access-key·secret-key)이 비어 있습니다.");
            }
            URI parsed = URI.create(endpoint);
            if (!"https".equals(parsed.getScheme()) && !"http".equals(parsed.getScheme())) {
                throw new IllegalStateException("S3 endpoint 는 http(s) URL 이어야 합니다.");
            }
            if (!bucket.matches("[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]")) {
                throw new IllegalStateException("S3 bucket 이름이 규칙에 맞지 않습니다.");
            }
            prefix = prefix == null ? "" : prefix.replaceAll("^/+|/+$", "");
            if (!prefix.isEmpty()) safeKeyPath(prefix);
        }
    }

    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    private final Settings settings;
    private final HttpClient http;
    private final Clock clock;
    private final S3RequestSigner signer;

    public S3FileStorageService(Settings settings, HttpClient http, Clock clock) {
        this.settings = Objects.requireNonNull(settings);
        this.http = Objects.requireNonNull(http);
        this.clock = Objects.requireNonNull(clock);
        this.signer = new S3RequestSigner(settings.accessKey(), settings.secretKey(), settings.region());
    }

    @Override
    public void init() {
        // 버킷은 저장소 운영자가 만든다. 기동 시 네트워크를 부르지 않는다(저장소 장애가 앱 기동을 막지 않게).
    }

    @Override
    public String store(MultipartFile file) {
        return store(file, "");
    }

    @Override
    public String store(MultipartFile file, String targetPath) {
        Objects.requireNonNull(file);
        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String extension = StringUtils.getFilenameExtension(originalFilename);
        if (extension != null && !extension.matches("[A-Za-z0-9]{1,10}")) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        if (file.isEmpty()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        String savedFilename = UUID.randomUUID() + (extension == null ? "" : "." + extension.toLowerCase(Locale.ROOT));
        String key = key(targetPath, savedFilename);
        long length = file.getSize();
        HttpResponse<Void> response;
        try (InputStream body = file.getInputStream()) {
            // 같은 키를 덮어쓰지 않는다 — UUID 충돌도 기존 객체를 바꾸지 않는다.
            response = send("PUT", key, Map.of(), Map.of("if-none-match", "*"),
                    HttpRequest.BodyPublishers.fromPublisher(HttpRequest.BodyPublishers.ofInputStream(() -> body), length),
                    HttpResponse.BodyHandlers.discarding());
        } catch (IOException e) {
            log.error("Could not read multipart file for object storage");
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
        if (response.statusCode() / 100 != 2) {
            log.error("Object storage rejected the upload: status={}", response.statusCode());
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
        return savedFilename;
    }

    @Override
    public Resource loadAsResource(String filename, String targetPath) {
        String key = key(targetPath, filename);
        HttpResponse<Void> head = send("HEAD", key, Map.of(), Map.of(), HttpRequest.BodyPublishers.noBody(),
                HttpResponse.BodyHandlers.discarding());
        if (head.statusCode() == 404) {
            throw new StorageObjectMissingException(targetPath, filename);
        }
        requireOk(head);
        long length = head.headers().firstValueAsLong("content-length").orElse(-1L);
        return new ObjectResource(key, filename, length);
    }

    @Override
    public Resource loadAsResource(String filename) {
        return loadAsResource(filename, "");
    }

    @Override
    public boolean exists(String filename, String targetPath) {
        try {
            return send("HEAD", key(targetPath, filename), Map.of(), Map.of(), HttpRequest.BodyPublishers.noBody(),
                    HttpResponse.BodyHandlers.discarding()).statusCode() == 200;
        } catch (RuntimeException unavailable) {
            return false;
        }
    }

    @Override
    public void delete(String filename, String targetPath) {
        HttpResponse<Void> response = send("DELETE", key(targetPath, filename), Map.of(), Map.of(),
                HttpRequest.BodyPublishers.noBody(), HttpResponse.BodyHandlers.discarding());
        if (response.statusCode() != 404) requireOk(response);
    }

    @Override
    public void delete(String filename) {
        delete(filename, "");
    }

    /** 지연 삭제 식별 — 객체의 ETag. 없으면 {@code ABSENT} 다(삭제할 것이 없다). */
    @Override
    public String captureDeletionIdentity(String filename, String targetPath) {
        HttpResponse<Void> head = send("HEAD", key(targetPath, filename), Map.of(), Map.of(),
                HttpRequest.BodyPublishers.noBody(), HttpResponse.BodyHandlers.discarding());
        if (head.statusCode() == 404) return "ABSENT";
        requireOk(head);
        return "etag:" + head.headers().firstValue("etag").orElseThrow(
                () -> new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR));
    }

    /** 준비한 것이 없다(ETag 는 읽기만 했다). */
    @Override
    public void releaseDeletionIdentity(String identity) {
    }

    /** 잡아 둔 ETag 의 객체만 지운다. 이미 없으면 끝난 것이고, ETag 가 다르면 지우지 않고 실패한다. */
    @Override
    public void deleteCaptured(UUID intent, String filename, String targetPath, String identity) {
        Objects.requireNonNull(intent);
        if ("ABSENT".equals(identity)) return;
        if (identity == null || !identity.startsWith("etag:")) {
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
        String key = key(targetPath, filename);
        HttpResponse<Void> head = send("HEAD", key, Map.of(), Map.of(), HttpRequest.BodyPublishers.noBody(),
                HttpResponse.BodyHandlers.discarding());
        if (head.statusCode() == 404) return;
        requireOk(head);
        if (!identity.substring(5).equals(head.headers().firstValue("etag").orElse(null))) {
            log.error("Object storage object changed after deletion was prepared; refusing to delete it");
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
        delete(filename, targetPath);
    }

    /** 한 단계 아래의 이름(파일·하위 접두)을 돌려준다 — 로컬 저장소의 {@code Files.walk(path, 1)} 과 같은 모양이다. */
    @Override
    public Stream<Path> loadAll(String targetPath) {
        String base = key(targetPath, null);
        String prefix = base.isEmpty() ? "" : base + "/";
        List<Path> names = new ArrayList<>();
        String token = null;
        do {
            Map<String, String> query = new LinkedHashMap<>();
            query.put("list-type", "2");
            query.put("delimiter", "/");
            query.put("prefix", prefix);
            if (token != null) query.put("continuation-token", token);
            HttpResponse<byte[]> response = send("GET", "", query, Map.of(), HttpRequest.BodyPublishers.noBody(),
                    HttpResponse.BodyHandlers.ofByteArray());
            requireOk(response);
            Document document = parse(response.body());
            for (String key : texts(document, "Contents", "Key")) names.add(Path.of(key.substring(prefix.length())));
            for (String sub : texts(document, "CommonPrefixes", "Prefix")) {
                names.add(Path.of(sub.substring(prefix.length()).replaceAll("/+$", "")));
            }
            boolean truncated = texts(document, "ListBucketResult", "IsTruncated").contains("true");
            List<String> next = texts(document, "ListBucketResult", "NextContinuationToken");
            token = truncated && !next.isEmpty() ? next.getFirst() : null;
        } while (token != null);
        return names.stream();
    }

    @Override
    public Stream<Path> loadAll() {
        return loadAll("");
    }

    /** 보고서에 적을 위치 — 버킷과 접두다(파일 시스템 경로가 아니다). */
    @Override
    public Path load(String filename) {
        String key = key(filename, null);
        return Path.of("s3-" + settings.bucket(), key.isEmpty() ? new String[0] : key.split("/"));
    }

    /** 운영 오브젝트 저장소의 전체 삭제는 받지 않는다 — 버킷 수명 주기 정책으로 관리한다. */
    @Override
    public void deleteAll() {
        throw new UnsupportedOperationException("Object storage does not support deleting every object");
    }

    // ------------------------------------------------------------------ 내부

    private String key(String targetPath, String filename) {
        List<String> parts = new ArrayList<>();
        if (!settings.prefix().isEmpty()) parts.add(settings.prefix());
        if (StringUtils.hasText(targetPath)) parts.add(safeKeyPath(targetPath.replaceAll("^/+|/+$", "")));
        if (filename != null) {
            if (!StringUtils.hasText(filename) || filename.contains("/") || filename.contains("\\")
                    || filename.equals(".") || filename.equals("..")) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
            }
            parts.add(filename);
        }
        return String.join("/", parts);
    }

    /** 키 경로는 영숫자·.-_ 조각만 받고 . / .. 조각과 역슬래시를 거부한다(저장소 밖으로 나가는 키를 만들지 않는다). */
    private static String safeKeyPath(String path) {
        for (String segment : path.split("/", -1)) {
            if (segment.isEmpty() || segment.equals(".") || segment.equals("..") || !segment.matches("[A-Za-z0-9._-]+")) {
                throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
            }
        }
        return path;
    }

    private <T> HttpResponse<T> send(String method, String key, Map<String, String> query, Map<String, String> extra,
            HttpRequest.BodyPublisher body, HttpResponse.BodyHandler<T> handler) {
        URI endpoint = URI.create(settings.endpoint().replaceAll("/+$", ""));
        String host = settings.pathStyle() ? endpoint.getRawAuthority() : settings.bucket() + "." + endpoint.getRawAuthority();
        String rawPath = (settings.pathStyle() ? "/" + settings.bucket() : "") + "/" + key;
        String encodedPath = S3RequestSigner.encodePath(rawPath);
        String canonicalQuery = S3RequestSigner.canonicalQuery(query);
        URI uri = URI.create(endpoint.getScheme() + "://" + host + encodedPath + (canonicalQuery.isEmpty() ? "" : "?" + canonicalQuery));
        String payloadHash = "PUT".equals(method) ? S3RequestSigner.UNSIGNED_PAYLOAD : S3RequestSigner.EMPTY_PAYLOAD_SHA256;
        Map<String, String> headers = signer.sign(method, host, encodedPath, query, extra, payloadHash, ZonedDateTime.now(clock));
        HttpRequest.Builder request = HttpRequest.newBuilder(uri).timeout(TIMEOUT).method(method, body);
        headers.forEach(request::header);
        try {
            return http.send(request.build(), handler);
        } catch (IOException e) {
            log.error("Object storage request failed: method={}", method);
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private static void requireOk(HttpResponse<?> response) {
        if (response.statusCode() / 100 != 2) {
            log.error("Object storage returned status={}", response.statusCode());
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private static Document parse(byte[] xml) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setExpandEntityReferences(false);
            factory.setNamespaceAware(false);
            return factory.newDocumentBuilder().parse(new java.io.ByteArrayInputStream(xml));
        } catch (Exception e) {
            throw new BusinessException(CommonErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    private static List<String> texts(Document document, String parent, String child) {
        List<String> values = new ArrayList<>();
        NodeList parents = document.getElementsByTagName(parent);
        if (parent.equals(document.getDocumentElement().getTagName())) {
            NodeList direct = document.getDocumentElement().getElementsByTagName(child);
            for (int i = 0; i < direct.getLength(); i++) {
                if (direct.item(i).getParentNode() == document.getDocumentElement()) values.add(direct.item(i).getTextContent());
            }
            return values;
        }
        for (int i = 0; i < parents.getLength(); i++) {
            NodeList children = ((Element) parents.item(i)).getElementsByTagName(child);
            for (int j = 0; j < children.getLength(); j++) values.add(children.item(j).getTextContent());
        }
        return values;
    }

    /** 내려받기를 미루는 객체 자원 — 길이는 HEAD 로 알고, 바이트는 읽을 때 GET 한다. */
    private final class ObjectResource extends AbstractResource {
        private final String key;
        private final String filename;
        private final long length;

        private ObjectResource(String key, String filename, long length) {
            this.key = key;
            this.filename = filename;
            this.length = length;
        }

        @Override
        public InputStream getInputStream() throws IOException {
            HttpResponse<InputStream> response = send("GET", key, Map.of(), Map.of(), HttpRequest.BodyPublishers.noBody(),
                    HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() / 100 != 2) {
                response.body().close();
                throw new java.io.FileNotFoundException("Object storage object is not readable");
            }
            return response.body();
        }

        @Override
        public boolean exists() {
            return true;
        }

        @Override
        public long contentLength() throws IOException {
            return length >= 0 ? length : super.contentLength();
        }

        @Override
        public String getFilename() {
            return filename;
        }

        @Override
        public String getDescription() {
            return "object storage resource [" + filename + "]";
        }
    }
}
