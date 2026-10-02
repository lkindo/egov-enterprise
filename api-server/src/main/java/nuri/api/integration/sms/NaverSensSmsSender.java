package nuri.api.integration.sms;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.GeneralSecurityException;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import nuri.business.service.sms.SmsGatewayResult;
import nuri.business.service.sms.SmsGatewayResult.Reason;
import nuri.business.service.sms.SmsGatewayResult.State;
import nuri.business.service.sms.SmsSender;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * NAVER Cloud SENS의 접수와 최종 수신 결과를 분리한다. POST를 애플리케이션에서 재시도하지 않는다.
 * 공식 계약: https://api.ncloud-docs.com/docs/sens-sms-send, sens-sms-list, sens-sms-get.
 */
public final class NaverSensSmsSender implements SmsSender, AutoCloseable {
    private static final URI PRODUCTION_ORIGIN = URI.create("https://sens.apigw.ntruss.com");
    private static final Charset CONTENT_CHARSET = Charset.forName("EUC-KR");
    private static final int MAX_RESPONSE_BYTES = 64 * 1024;

    private final HttpClient client;
    private final ObjectMapper json;
    private final Clock clock;
    private final URI origin;
    private final String messagesPath;
    private final String accessKey;
    private final String secretKey;
    private final String registeredSender;
    private final Duration requestTimeout;

    NaverSensSmsSender(NaverSensSmsProperties properties, ObjectMapper json) {
        this(properties, json, PRODUCTION_ORIGIN, Clock.systemUTC());
    }

    /** 실제 공급자 주소는 설정으로 바꾸지 못한다. 이 생성자는 같은 패키지의 루프백 HTTP 시험용이다. */
    NaverSensSmsSender(NaverSensSmsProperties properties, ObjectMapper json, Clock clock, URI testOrigin) {
        this(properties, json, requireLoopback(testOrigin), clock);
    }

    private NaverSensSmsSender(NaverSensSmsProperties properties, ObjectMapper json, URI origin, Clock clock) {
        properties.validate();
        validateNetworkOptions();
        this.json = java.util.Objects.requireNonNull(json);
        this.clock = java.util.Objects.requireNonNull(clock);
        this.origin = origin;
        this.messagesPath = "/sms/v2/services/" + properties.getServiceId() + "/messages";
        this.accessKey = properties.getAccessKey();
        this.secretKey = properties.getSecretKey();
        this.registeredSender = properties.getRegisteredSender();
        this.requestTimeout = properties.getRequestTimeout();
        this.client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(properties.getConnectTimeout())
                .build();
    }

    @Override
    public SmsGatewayResult send(String recipientPhone, String message, String senderPhone) {
        String recipient = canonicalPhone(recipientPhone);
        if (recipient == null || !registeredSender.equals(canonicalPhone(senderPhone))) {
            return SmsGatewayResult.rejected(Reason.INVALID_REQUEST);
        }
        int contentBytes = contentBytes(message);
        if (contentBytes < 1 || contentBytes > 2000) {
            return SmsGatewayResult.rejected(Reason.INVALID_REQUEST);
        }
        try {
            var body = json.createObjectNode()
                    .put("type", contentBytes <= 90 ? "SMS" : "LMS")
                    .put("contentType", "COMM")
                    .put("countryCode", "82")
                    .put("from", registeredSender)
                    .put("content", message);
            body.putArray("messages").addObject().put("to", recipient);
            HttpResponse<byte[]> response = exchange("POST", messagesPath, json.writeValueAsBytes(body));
            if (response == null) return SmsGatewayResult.unknown(Reason.UNCONFIRMED);
            if (response.statusCode() == 408) return SmsGatewayResult.unknown(Reason.UNCONFIRMED);
            if (response.statusCode() >= 400 && response.statusCode() < 500) {
                return SmsGatewayResult.rejected(Reason.PROVIDER_REJECTED);
            }
            if (response.statusCode() != 202) return SmsGatewayResult.unknown(Reason.UNCONFIRMED);
            JsonNode accepted = json.readTree(response.body());
            String requestId = text(accepted, "requestId");
            if (!validId(requestId) || !optionalEquals(accepted, "statusCode", "202")
                    || !optionalEquals(accepted, "statusName", "success")) {
                return SmsGatewayResult.unknown(Reason.UNCONFIRMED);
            }
            return SmsGatewayResult.accepted(requestId);
        } catch (RuntimeException ignored) {
            // 공급자 원문이나 Jackson/HTTP 예외에는 전화번호·본문·인증 헤더가 들어갈 수 있다.
            return SmsGatewayResult.unknown(Reason.UNCONFIRMED);
        }
    }

    @Override
    public SmsGatewayResult query(String requestId, String messageId, String recipientPhone) {
        String recipient = canonicalPhone(recipientPhone);
        if (!validId(requestId) || (messageId != null && !validId(messageId)) || recipient == null) {
            return SmsGatewayResult.unknown(Reason.LOOKUP_FAILED);
        }
        String resolvedMessageId = messageId;
        try {
            if (resolvedMessageId == null) {
                String target = messagesPath + "?requestId=" + encodeQuery(requestId) + "&pageSize=2";
                HttpResponse<byte[]> response = exchange("GET", target, null);
                if (response == null || (response.statusCode() != 200 && response.statusCode() != 202)) {
                    return lookupFailed(requestId, null);
                }
                JsonNode listing = json.readTree(response.body());
                if (!optionalSuccess(listing, "200", "202")
                        || (listing.has("hasMore") && !listing.path("hasMore").isBoolean())
                        || listing.path("hasMore").asBoolean(false)) {
                    return lookupFailed(requestId, null);
                }
                JsonNode messages = listing.path("messages");
                if (!messages.isArray() || messages.size() != 1) {
                    return lookupFailed(requestId, null);
                }
                JsonNode candidate = messages.get(0);
                if (!requestId.equals(text(candidate, "requestId"))
                        || !recipient.equals(text(candidate, "to"))
                        || !validId(text(candidate, "messageId"))) {
                    return lookupFailed(requestId, null);
                }
                resolvedMessageId = text(candidate, "messageId");
            }
            HttpResponse<byte[]> response = exchange("GET", messagesPath + "/" + resolvedMessageId, null);
            if (response == null || response.statusCode() != 200) return lookupFailed(requestId, resolvedMessageId);
            JsonNode receipt = json.readTree(response.body());
            JsonNode messages = receipt.path("messages");
            if (!optionalSuccess(receipt, "200") || !messages.isArray() || messages.size() != 1) {
                return lookupFailed(requestId, resolvedMessageId);
            }
            JsonNode detail = messages.get(0);
            if (!requestId.equals(text(detail, "requestId"))
                    || !resolvedMessageId.equals(text(detail, "messageId"))
                    || !recipient.equals(text(detail, "to"))) {
                return lookupFailed(requestId, resolvedMessageId);
            }
            String status = text(detail, "status");
            if ("READY".equals(status) || "PROCESSING".equals(status)) {
                return SmsGatewayResult.pending(requestId, resolvedMessageId);
            }
            if (!"COMPLETED".equals(status)) return lookupFailed(requestId, resolvedMessageId);
            String resultCode = text(detail, "statusCode");
            if ("0".equals(resultCode) && optionalEquals(detail, "statusName", "success")) {
                return SmsGatewayResult.delivered(requestId, resolvedMessageId);
            }
            if (resultCode != null && resultCode.matches("[A-Za-z0-9]{1,12}") && !"0".equals(resultCode)
                    && optionalEquals(detail, "statusName", "fail")) {
                return SmsGatewayResult.rejected(requestId, resolvedMessageId, Reason.PROVIDER_REJECTED);
            }
            return lookupFailed(requestId, resolvedMessageId);
        } catch (RuntimeException ignored) {
            return lookupFailed(requestId, resolvedMessageId);
        }
    }

    @Override
    public boolean isDeliveryConfigured() {
        return true;
    }

    @Override
    public String registeredSender() {
        return registeredSender;
    }

    private HttpResponse<byte[]> exchange(String method, String target, byte[] body) {
        CompletableFuture<HttpResponse<byte[]>> call = null;
        try {
            String timestamp = Long.toString(clock.millis());
            HttpRequest.Builder request = HttpRequest.newBuilder(origin.resolve(target))
                    .timeout(requestTimeout)
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .header("Accept", "application/json")
                    .header("x-ncp-apigw-timestamp", timestamp)
                    .header("x-ncp-iam-access-key", accessKey)
                    .header("x-ncp-apigw-signature-v2", signature(method, target, timestamp));
            if (body == null) request.GET();
            else request.POST(new SingleUseBodyPublisher(body));
            call = client.sendAsync(request.build(), ignored -> new BoundedBodySubscriber());
            // HttpRequest.timeout may finish at headers; this bound also covers stalled response bodies.
            return call.get(requestTimeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (InterruptedException ignored) {
            if (call != null) call.cancel(true);
            Thread.currentThread().interrupt();
            return null;
        } catch (ExecutionException | TimeoutException | GeneralSecurityException | RuntimeException ignored) {
            if (call != null) call.cancel(true);
            return null;
        }
    }

    private String signature(String method, String target, String timestamp) throws GeneralSecurityException {
        Mac hmac = Mac.getInstance("HmacSHA256");
        hmac.init(new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] signed = hmac.doFinal((method + " " + target + "\n" + timestamp + "\n" + accessKey)
                .getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(signed);
    }

    private static int contentBytes(String message) {
        if (message == null || message.isBlank() || message.length() > 2000) return -1;
        try {
            return CONTENT_CHARSET.newEncoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).encode(CharBuffer.wrap(message)).remaining();
        } catch (CharacterCodingException ignored) {
            return -1;
        }
    }

    private static String canonicalPhone(String phone) {
        if (phone == null) return null;
        String value = phone.trim().replace("-", "");
        return value.matches("[0-9]{1,11}") ? value : null;
    }

    private static boolean validId(String id) {
        return id != null && id.matches("[A-Za-z0-9_:.~-]{1,160}") && !id.equals(".") && !id.equals("..");
    }

    private static String text(JsonNode object, String field) {
        JsonNode value = object == null ? null : object.get(field);
        return value != null && value.isString() ? value.asString() : null;
    }

    private static boolean optionalEquals(JsonNode object, String field, String expected) {
        return object != null && object.isObject()
                && (!object.has(field) || object.path(field).isNull() || expected.equals(text(object, field)));
    }

    private static boolean optionalSuccess(JsonNode object, String... expectedCodes) {
        if (!optionalEquals(object, "statusName", "success")) return false;
        String code = text(object, "statusCode");
        return !object.has("statusCode") || object.path("statusCode").isNull()
                || (code != null && List.of(expectedCodes).contains(code));
    }

    private static SmsGatewayResult lookupFailed(String requestId, String messageId) {
        return new SmsGatewayResult(State.PENDING, requestId, messageId, Reason.LOOKUP_FAILED);
    }

    private static String encodeQuery(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private static URI requireLoopback(URI origin) {
        if (origin == null || !"http".equals(origin.getScheme()) || origin.getUserInfo() != null
                || origin.getQuery() != null || origin.getFragment() != null
                || (origin.getPath() != null && !origin.getPath().isEmpty() && !origin.getPath().equals("/"))
                || !("127.0.0.1".equals(origin.getHost()) || "[::1]".equals(origin.getHost()))
                || origin.getPort() < 1 || origin.getPort() > 65535) {
            throw new IllegalArgumentException("SENS test endpoint must be an explicit loopback HTTP origin");
        }
        return origin;
    }

    /** JDK21 reads these options from system properties or conf/net.properties. No global setting is changed. */
    private static void validateNetworkOptions() {
        Properties defaults = new Properties();
        Path file = Path.of(System.getProperty("java.home"), "conf", "net.properties");
        try {
            if (Files.exists(file)) {
                try (var input = Files.newInputStream(file)) { defaults.load(input); }
            }
            validateNetworkOptions(
                    System.getProperty("jdk.httpclient.enableAllMethodRetry", defaults.getProperty("jdk.httpclient.enableAllMethodRetry")),
                    System.getProperty("jdk.httpclient.HttpClient.log", defaults.getProperty("jdk.httpclient.HttpClient.log")),
                    System.getProperty("jdk.internal.httpclient.disableHostnameVerification"),
                    System.getProperty("jdk.internal.httpclient.debug"));
        } catch (IOException | SecurityException ignored) {
            throw new IllegalArgumentException("SENS HTTP client safety settings could not be verified");
        }
    }

    static void validateNetworkOptions(String retryAllMethods, String rawLogging, String insecureHostname, String debugLogging) {
        if (enabledFlag(retryAllMethods)) {
            throw new IllegalArgumentException("SENS requires non-idempotent HTTP automatic retry to be disabled");
        }
        if (enabledFlag(insecureHostname)) {
            throw new IllegalArgumentException("SENS requires TLS hostname verification");
        }
        if (loggingEnabled(rawLogging) || loggingEnabled(debugLogging)) {
            throw new IllegalArgumentException("SENS requires HTTP wire logging to be disabled");
        }
    }

    private static boolean enabledFlag(String value) {
        return value != null && (value.isEmpty() || Boolean.parseBoolean(value));
    }

    private static boolean loggingEnabled(String value) {
        return value != null && !value.isBlank() && !"none".equalsIgnoreCase(value) && !"false".equalsIgnoreCase(value);
    }

    @Override
    public void close() {
        client.shutdownNow();
    }

    @Override
    public String toString() {
        return "NaverSensSmsSender[configured=true]";
    }

    /** JDK may retry before acceptance; the SMS payload can be subscribed only once even then. */
    static final class SingleUseBodyPublisher implements HttpRequest.BodyPublisher {
        private final HttpRequest.BodyPublisher body;
        private final AtomicBoolean subscribed = new AtomicBoolean();

        SingleUseBodyPublisher(byte[] bytes) {
            body = HttpRequest.BodyPublishers.ofByteArray(bytes);
        }

        @Override public long contentLength() { return body.contentLength(); }

        @Override
        public void subscribe(Flow.Subscriber<? super ByteBuffer> subscriber) {
            if (subscribed.compareAndSet(false, true)) body.subscribe(subscriber);
            else {
                subscriber.onSubscribe(new Flow.Subscription() {
                    @Override public void request(long count) { }
                    @Override public void cancel() { }
                });
                subscriber.onError(new IOException("SENS request payload cannot be retransmitted"));
            }
        }
    }

    private static final class BoundedBodySubscriber implements HttpResponse.BodySubscriber<byte[]> {
        private final CompletableFuture<byte[]> result = new CompletableFuture<>();
        private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        private Flow.Subscription subscription;

        @Override public CompletionStage<byte[]> getBody() { return result; }

        @Override
        public void onSubscribe(Flow.Subscription subscription) {
            this.subscription = subscription;
            subscription.request(1);
        }

        @Override
        public void onNext(List<ByteBuffer> buffers) {
            for (ByteBuffer buffer : buffers) {
                int size = buffer.remaining();
                if (size > MAX_RESPONSE_BYTES - bytes.size()) {
                    subscription.cancel();
                    result.completeExceptionally(new IOException("SENS response exceeds the safe size limit"));
                    return;
                }
                byte[] part = new byte[size];
                buffer.get(part);
                bytes.writeBytes(part);
            }
            subscription.request(1);
        }

        @Override public void onError(Throwable ignored) {
            result.completeExceptionally(new IOException("SENS response could not be confirmed"));
        }
        @Override public void onComplete() { result.complete(bytes.toByteArray()); }
    }
}
