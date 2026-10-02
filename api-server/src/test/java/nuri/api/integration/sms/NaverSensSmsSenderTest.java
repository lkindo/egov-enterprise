package nuri.api.integration.sms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Flow;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import nuri.business.service.sms.SmsGatewayResult;
import nuri.business.service.sms.SmsGatewayResult.Reason;
import nuri.business.service.sms.SmsGatewayResult.State;
import nuri.business.service.sms.SmsSender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/** 실제 HTTP·서명·바이트 계약을 루프백 공급자로 검사하며 실제 문자를 보내지 않는다. */
class NaverSensSmsSenderTest {
    private static final String ACCESS = "synthetic-sens-access";
    private static final String SECRET = "synthetic-sens-secret";
    private static final String FROM = "029876543";
    private static final String TO = "01012345678";
    private static final String REQUEST = "request:synthetic~1";
    private static final String MESSAGE = "message-synthetic-1";
    private static final String PATH = "/sms/v2/services/ncp:sms:kr:synthetic:test/messages";
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-01T00:00:00Z"), ZoneOffset.UTC);
    private static final ObjectMapper JSON = JsonMapper.builder().configureForJackson2().build();

    private HttpServer server;
    private ExecutorService executor;
    private URI origin;
    private final Queue<Reply> replies = new ConcurrentLinkedQueue<>();
    private final List<Request> requests = new CopyOnWriteArrayList<>();
    private final List<NaverSensSmsSender> clients = new ArrayList<>();
    private final AtomicInteger postCount = new AtomicInteger();

    @BeforeEach
    void startMockGateway() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        executor = Executors.newFixedThreadPool(2);
        server.setExecutor(executor);
        server.createContext("/", this::respond);
        server.start();
        origin = URI.create("http://127.0.0.1:" + server.getAddress().getPort());
    }

    @AfterEach
    void stopMockGateway() {
        clients.forEach(NaverSensSmsSender::close);
        if (server != null) server.stop(0);
        if (executor != null) executor.shutdownNow();
    }

    @Test
    void signedPostIsAcceptedPendingAndContainsOnlyTheRegisteredSender() throws Exception {
        replies.add(accepted());
        NaverSensSmsSender sender = sender(properties());

        SmsGatewayResult result = sender.send(" 010-1234-5678 ", "합성 알림", "02-987-6543");

        assertThat(result.state()).isEqualTo(State.PENDING);
        assertThat(result.reason()).isEqualTo(Reason.ACCEPTED);
        assertThat(result.requestId()).isEqualTo(REQUEST);
        assertThat(result.messageId()).isNull();
        assertThat(sender.isDeliveryConfigured()).isTrue();
        assertThat(sender.registeredSender()).isEqualTo(FROM);
        assertThat(postCount).hasValue(1);
        Request request = requests.get(0);
        assertThat(request.method()).isEqualTo("POST");
        assertThat(request.target()).isEqualTo(PATH);
        assertSignature(request);
        JsonNode body = JSON.readTree(request.body());
        assertThat(body.path("type").asString()).isEqualTo("SMS");
        assertThat(body.path("contentType").asString()).isEqualTo("COMM");
        assertThat(body.path("countryCode").asString()).isEqualTo("82");
        assertThat(body.path("from").asString()).isEqualTo(FROM);
        assertThat(body.path("content").asString()).isEqualTo("합성 알림");
        assertThat(body.path("messages").size()).isEqualTo(1);
        assertThat(body.path("messages").get(0).path("to").asString()).isEqualTo(TO);
        assertThat(result.toString()).doesNotContain(REQUEST, MESSAGE, FROM, TO, ACCESS, SECRET, "합성 알림");
        assertThat(sender.toString()).doesNotContain(FROM, TO, ACCESS, SECRET);
    }

    @Test
    void http202AndRequestIdRemainAcceptedWhenOptionalNamesAreAbsent() {
        replies.add(Reply.json(202, "{\"requestId\":\"" + REQUEST + "\"}"));
        assertThat(sender(properties()).send(TO, "합성", FROM).reason()).isEqualTo(Reason.ACCEPTED);
        assertThat(postCount).hasValue(1);
    }

    @ParameterizedTest(name = "{index}: Korean byte boundary")
    @CsvSource({"45,SMS", "46,LMS", "1000,LMS"})
    void koreanByteLimitsSelectSmsOrLmsWithoutTruncation(int koreanCharacters, String expectedType) {
        replies.add(accepted());
        String content = "가".repeat(koreanCharacters);
        SmsGatewayResult result = sender(properties()).send(TO, content, FROM);

        assertThat(result.state()).isEqualTo(State.PENDING);
        JsonNode body = JSON.readTree(requests.get(0).body());
        assertThat(body.path("type").asString()).isEqualTo(expectedType);
        assertThat(body.path("content").asString()).isEqualTo(content);
        assertThat(postCount).hasValue(1);
    }

    @ParameterizedTest(name = "{index}: invalid content rejected before HTTP")
    @MethodSource("invalidContent")
    void invalidOrUnencodableContentIsRejectedBeforeAnyHttpRequest(String content) {
        SmsGatewayResult result = sender(properties()).send(TO, content, FROM);
        assertThat(result.state()).isEqualTo(State.REJECTED);
        assertThat(result.reason()).isEqualTo(Reason.INVALID_REQUEST);
        assertThat(postCount).hasValue(0);
        assertThat(requests).isEmpty();
    }

    static Stream<Arguments> invalidContent() {
        return Stream.of(Arguments.of((Object) null), Arguments.of(""), Arguments.of(" "),
                Arguments.of("가".repeat(1001)), Arguments.of("a".repeat(2001)),
                Arguments.of("합성 😀"), Arguments.of("\ud800"));
    }

    @ParameterizedTest(name = "{index}: invalid recipient or unregistered sender")
    @CsvSource({"01012345678,0312345678", "010abcdefgh,029876543", "010123456789,029876543", "+821012345678,029876543"})
    void invalidRecipientsOrUnregisteredSenderAreRejectedLocally(String to, String from) {
        assertThat(sender(properties()).send(to, "합성", from).reason()).isEqualTo(Reason.INVALID_REQUEST);
        assertThat(requests).isEmpty();
    }

    @ParameterizedTest(name = "{index}: explicit HTTP rejection")
    @ValueSource(ints = {400, 401, 403, 404, 413, 429})
    void explicitRejectionsDoNotRetryOrExposeProviderErrorContent(int httpStatus) {
        replies.add(Reply.json(httpStatus, "{\"errorMessage\":\"" + SECRET + " " + TO + " 합성 내용\"}"));
        SmsGatewayResult result = sender(properties()).send(TO, "합성 내용", FROM);

        assertThat(result.state()).isEqualTo(State.REJECTED);
        assertThat(result.reason()).isEqualTo(Reason.PROVIDER_REJECTED);
        assertThat(result.toString()).doesNotContain(SECRET, TO, "합성 내용");
        assertThat(postCount).hasValue(1);
    }

    @ParameterizedTest(name = "{index}: ambiguous POST remains unconfirmed")
    @MethodSource("unconfirmedSendReplies")
    void ambiguousPostResultsRemainUnknownWithOnePost(Reply reply) {
        replies.add(reply);
        SmsGatewayResult result = sender(properties()).send(TO, "합성 내용", FROM);

        assertThat(result.state()).isEqualTo(State.UNKNOWN);
        assertThat(result.reason()).isEqualTo(Reason.UNCONFIRMED);
        assertThat(result.requestId()).isNull();
        assertThat(result.toString()).doesNotContain(SECRET, TO, "합성 내용");
        assertThat(postCount).hasValue(1);
    }

    static Stream<Reply> unconfirmedSendReplies() {
        return Stream.of(Reply.json(408, "request timeout"), Reply.json(500, "provider error"), Reply.json(503, "provider timeout"),
                Reply.json(202, "not-json"), Reply.json(202, "{}"),
                Reply.json(202, "{\"requestId\":\"bad/id\"}"),
                Reply.json(202, "{\"requestId\":\"" + REQUEST + "\",\"statusName\":\"fail\"}"),
                Reply.json(202, "{\"requestId\":\"" + REQUEST + "\",\"statusCode\":\"500\"}"),
                Reply.json(200, "{\"requestId\":\"" + REQUEST + "\"}"),
                Reply.json(202, "{\"requestId\":\"" + "x".repeat(161) + "\"}"),
                Reply.json(202, "x".repeat(70_000)), Reply.closed());
    }

    @Test
    void acceptedPostThenClosedKeepAliveConnectionDoesNotPublishAgain() {
        replies.add(accepted());
        replies.add(Reply.closed());
        NaverSensSmsSender sender = sender(properties());

        assertThat(sender.send(TO, "첫 합성", FROM).reason()).isEqualTo(Reason.ACCEPTED);
        assertThat(sender.send(TO, "다음 합성", FROM).state()).isEqualTo(State.UNKNOWN);

        assertThat(postCount).hasValue(2);
        assertThat(requests).hasSize(2);
    }

    @ParameterizedTest(name = "{index}: bounded header or body timeout")
    @ValueSource(booleans = {false, true})
    void headerOrBodyTimeoutRemainsUnknownAndDoesNotResend(boolean bodyTimeout) {
        replies.add(new Reply(202, "{\"requestId\":\"" + REQUEST + "\"}",
                bodyTimeout ? 0 : 1200, bodyTimeout ? 1200 : 0, false, null));
        NaverSensSmsProperties properties = properties();
        properties.setConnectTimeout(Duration.ofMillis(200));
        properties.setRequestTimeout(Duration.ofMillis(500));
        long started = System.nanoTime();

        SmsGatewayResult result = sender(properties).send(TO, "합성 내용", FROM);

        assertThat(result.state()).isEqualTo(State.UNKNOWN);
        assertThat(Duration.ofNanos(System.nanoTime() - started)).isLessThan(Duration.ofSeconds(3));
        assertThat(postCount).hasValue(1);
    }

    @Test
    void redirectsAreNotFollowedAndDoNotTurnIntoAnotherPostOrCredentialRequest() {
        replies.add(new Reply(307, "redirect", 0, 0, false, origin + "/redirected"));

        assertThat(sender(properties()).send(TO, "합성", FROM).state()).isEqualTo(State.UNKNOWN);

        assertThat(postCount).hasValue(1);
        assertThat(requests).hasSize(1);
        assertThat(requests.get(0).target()).isEqualTo(PATH);
    }

    @Test
    void listAndReceiptQueriesSignTheActualEncodedTargetAndRequireCorrelatedDelivery() throws Exception {
        replies.add(Reply.json(200, listing(REQUEST, MESSAGE, TO)));
        replies.add(Reply.json(200, detail(REQUEST, MESSAGE, TO, "COMPLETED", "0", "success")));

        SmsGatewayResult result = sender(properties()).query(REQUEST, null, TO);

        assertThat(result.state()).isEqualTo(State.DELIVERED);
        assertThat(result.reason()).isEqualTo(Reason.DELIVERED);
        assertThat(result.requestId()).isEqualTo(REQUEST);
        assertThat(result.messageId()).isEqualTo(MESSAGE);
        assertThat(postCount).hasValue(0);
        assertThat(requests).hasSize(2);
        assertThat(requests.get(0).target()).isEqualTo(PATH + "?requestId=request%3Asynthetic%7E1&pageSize=2");
        assertThat(requests.get(1).target()).isEqualTo(PATH + "/" + MESSAGE);
        for (Request request : requests) {
            assertThat(request.method()).isEqualTo("GET");
            assertSignature(request);
        }
    }

    @ParameterizedTest(name = "{index}: receipt state and final code")
    @CsvSource({"READY,0,success,PENDING", "PROCESSING,0,success,PENDING", "COMPLETED,0,success,DELIVERED",
            "COMPLETED,3018,fail,REJECTED", "COMPLETED,S004,fail,REJECTED", "COMPLETED,0,fail,PENDING",
            "COMPLETED,3018,success,PENDING", "UNRECOGNIZED,0,success,PENDING"})
    void receiptStatusAndCodeSeparateAcceptedProcessingDeliveredAndRejected(String status, String code, String name, State expected) {
        replies.add(Reply.json(200, detail(REQUEST, MESSAGE, TO, status, code, name)));

        SmsGatewayResult result = sender(properties()).query(REQUEST, MESSAGE, TO);

        assertThat(result.state()).isEqualTo(expected);
        assertThat(result.requestId()).isEqualTo(REQUEST);
        assertThat(result.messageId()).isEqualTo(MESSAGE);
        assertThat(requests).hasSize(1);
        assertThat(postCount).hasValue(0);
    }

    @ParameterizedTest(name = "{index}: optional receipt status name")
    @CsvSource({"0,DELIVERED", "3018,REJECTED"})
    void optionalReceiptStatusNameDoesNotOverrideAuthoritativeFinalCode(String code, State expected) {
        replies.add(Reply.json(200, detail(REQUEST, MESSAGE, TO, "COMPLETED", code, null)));
        assertThat(sender(properties()).query(REQUEST, MESSAGE, TO).state()).isEqualTo(expected);
        assertThat(postCount).hasValue(0);
    }

    @Test
    void nullOptionalReceiptStatusNameIsAnAbsentNameAndFinalCodeStillApplies() {
        String receipt = detail(REQUEST, MESSAGE, TO, "COMPLETED", "0", null);
        replies.add(Reply.json(200, receipt.replace("\"statusCode\":\"0\"", "\"statusCode\":\"0\",\"statusName\":null")));
        assertThat(sender(properties()).query(REQUEST, MESSAGE, TO).state()).isEqualTo(State.DELIVERED);
    }

    @ParameterizedTest(name = "{index}: untrusted receipt remains pending")
    @MethodSource("uncorrelatedReceiptReplies")
    void untrustedOrMissingReceiptCannotPromoteAcceptedMessageToDelivered(String body) {
        replies.add(Reply.json(200, body));

        SmsGatewayResult result = sender(properties()).query(REQUEST, MESSAGE, TO);

        assertThat(result.state()).isEqualTo(State.PENDING);
        assertThat(result.reason()).isEqualTo(Reason.LOOKUP_FAILED);
        assertThat(result.requestId()).isEqualTo(REQUEST);
        assertThat(result.messageId()).isEqualTo(MESSAGE);
        assertThat(postCount).hasValue(0);
    }

    static Stream<String> uncorrelatedReceiptReplies() {
        return Stream.of("{}", "not-json", "{\"messages\":[]}",
                detail("other-request", MESSAGE, TO, "COMPLETED", "0", "success"),
                detail(REQUEST, "other-message", TO, "COMPLETED", "0", "success"),
                detail(REQUEST, MESSAGE, "01087654321", "COMPLETED", "0", "success"),
                detail(REQUEST, MESSAGE, TO, "COMPLETED", null, "success"),
                detail(REQUEST, MESSAGE, TO, "COMPLETED", "200", "success"),
                "{\"messages\":[{\"requestId\":\"" + REQUEST + "\",\"messageId\":\"" + MESSAGE
                        + "\",\"to\":\"" + TO + "\",\"status\":\"COMPLETED\",\"statusCode\":0}]}",
                detail(REQUEST, MESSAGE, TO, "COMPLETED", "0", "success").replace("\"statusCode\":\"200\"", "\"statusCode\":\"500\""));
    }

    @ParameterizedTest(name = "{index}: untrusted listing remains pending")
    @MethodSource("untrustedListings")
    void listingMustResolveExactlyOneRecipientForThisRequestBeforeFetchingDetails(String body) {
        replies.add(Reply.json(200, body));
        SmsGatewayResult result = sender(properties()).query(REQUEST, null, TO);

        assertThat(result.state()).isEqualTo(State.PENDING);
        assertThat(result.reason()).isEqualTo(Reason.LOOKUP_FAILED);
        assertThat(result.messageId()).isNull();
        assertThat(requests).hasSize(1);
        assertThat(postCount).hasValue(0);
    }

    static Stream<String> untrustedListings() {
        String single = listing(REQUEST, MESSAGE, TO);
        String item = "{\"requestId\":\"" + REQUEST + "\",\"messageId\":\"" + MESSAGE + "\",\"to\":\"" + TO + "\"}";
        return Stream.of("not-json", "{}", "{\"messages\":[]}",
                listing("other-request", MESSAGE, TO), listing(REQUEST, MESSAGE, "01087654321"),
                listing(REQUEST, "invalid/message", TO), single.replace("false", "true"),
                single.replace("false", "\"false\""),
                "{\"messages\":[" + item + "," + item + "]}");
    }

    @ParameterizedTest(name = "{index}: receipt HTTP failure remains pending")
    @ValueSource(ints = {404, 429, 500, 503})
    void failedReceiptGetKeepsItsIdsPendingAndNeverCallsPost(int status) {
        replies.add(Reply.json(status, "provider error"));
        SmsGatewayResult result = sender(properties()).query(REQUEST, MESSAGE, TO);

        assertThat(result.state()).isEqualTo(State.PENDING);
        assertThat(result.reason()).isEqualTo(Reason.LOOKUP_FAILED);
        assertThat(result.messageId()).isEqualTo(MESSAGE);
        assertThat(postCount).hasValue(0);
    }

    @Test
    void newlyResolvedMessageIdSurvivesReceiptGetFailure() {
        replies.add(Reply.json(200, listing(REQUEST, MESSAGE, TO)));
        replies.add(Reply.json(503, "unavailable"));

        SmsGatewayResult result = sender(properties()).query(REQUEST, null, TO);

        assertThat(result.state()).isEqualTo(State.PENDING);
        assertThat(result.reason()).isEqualTo(Reason.LOOKUP_FAILED);
        assertThat(result.messageId()).isEqualTo(MESSAGE);
        assertThat(postCount).hasValue(0);
    }

    @Test
    void receiptBodyTimeoutRetainsTheReceiptAndNeverResends() {
        replies.add(new Reply(200, detail(REQUEST, MESSAGE, TO, "COMPLETED", "0", "success"), 0, 1200, false, null));
        NaverSensSmsProperties properties = properties();
        properties.setConnectTimeout(Duration.ofMillis(200));
        properties.setRequestTimeout(Duration.ofMillis(500));

        SmsGatewayResult result = sender(properties).query(REQUEST, MESSAGE, TO);

        assertThat(result.state()).isEqualTo(State.PENDING);
        assertThat(result.messageId()).isEqualTo(MESSAGE);
        assertThat(postCount).hasValue(0);
    }

    @Test
    void unsafeReceiptIdentifiersDoNotBecomeUrls() {
        NaverSensSmsSender sender = sender(properties());
        assertThat(sender.query("request/other", null, TO).state()).isEqualTo(State.UNKNOWN);
        assertThat(sender.query(REQUEST, "..", TO).state()).isEqualTo(State.UNKNOWN);
        assertThat(sender.query(REQUEST, MESSAGE, "not-a-number").state()).isEqualTo(State.UNKNOWN);
        assertThat(requests).isEmpty();
    }

    @Test
    void configuredSecretsAreRedactedAndValidationErrorsDoNotEchoTheirValues() {
        NaverSensSmsProperties properties = properties();
        assertThat(properties.toString()).doesNotContain(ACCESS, SECRET, FROM, properties.getServiceId());
        properties.setAccessKey(ACCESS + "\r\n");
        assertThatThrownBy(() -> sender(properties)).isInstanceOf(IllegalArgumentException.class)
                .hasMessage("SENS access-key is missing or invalid");
    }

    @Test
    void missingCredentialsAndUnboundedTimeoutsFailConfiguration() {
        NaverSensSmsProperties missing = properties();
        missing.setSecretKey(null);
        assertThatThrownBy(() -> sender(missing)).hasMessage("SENS secret-key is missing or invalid");
        NaverSensSmsProperties unbounded = properties();
        unbounded.setRequestTimeout(Duration.ofSeconds(31));
        assertThatThrownBy(() -> sender(unbounded)).isInstanceOf(IllegalArgumentException.class);
        unbounded.setRequestTimeout(Duration.ofMillis(100));
        assertThatThrownBy(() -> sender(unbounded)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void productionAdapterHasNoConfigurableExternalEndpointAndTestOriginMustBeLoopback() {
        assertThatThrownBy(() -> new NaverSensSmsSender(properties(), JSON, CLOCK, URI.create("http://example.com:8080")))
                .hasMessage("SENS test endpoint must be an explicit loopback HTTP origin");
        assertThatThrownBy(() -> new NaverSensSmsSender(properties(), JSON, CLOCK, origin.resolve("/changed")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void providerChoiceBindsTheRealAdapterAndMissingRequiredConfigurationFailsStartup() {
        ApplicationContextRunner runner = new ApplicationContextRunner()
                .withUserConfiguration(NaverSensSmsConfiguration.class)
                .withBean(ObjectMapper.class, () -> JSON);
        runner.withPropertyValues("nuri.sms.provider=none").run(context -> assertThat(context).doesNotHaveBean(SmsSender.class));
        runner.withPropertyValues("nuri.sms.provider=sens").run(context -> assertThat(context).hasFailed());
        runner.withPropertyValues("nuri.sms.provider=sens", "nuri.sms.sens.service-id=ncp:sms:kr:synthetic:test",
                "nuri.sms.sens.access-key=" + ACCESS, "nuri.sms.sens.secret-key=" + SECRET,
                "nuri.sms.sens.registered-sender=" + FROM).run(context -> {
            assertThat(context).hasSingleBean(SmsSender.class);
            assertThat(context.getBean(SmsSender.class)).isInstanceOf(NaverSensSmsSender.class);
        });
        assertThat(requests).isEmpty();
    }

    @Test
    void unsafeJvmRetryAndWireLoggingOptionsAreRejectedWithoutChangingGlobalProperties() {
        NaverSensSmsSender.validateNetworkOptions(null, null, null, null);
        NaverSensSmsSender.validateNetworkOptions("false", "none", "false", "false");
        assertThatThrownBy(() -> NaverSensSmsSender.validateNetworkOptions("true", null, null, null))
                .hasMessage("SENS requires non-idempotent HTTP automatic retry to be disabled");
        assertThatThrownBy(() -> NaverSensSmsSender.validateNetworkOptions("", null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> NaverSensSmsSender.validateNetworkOptions(null, "headers,content", null, null))
                .hasMessage("SENS requires HTTP wire logging to be disabled");
        assertThatThrownBy(() -> NaverSensSmsSender.validateNetworkOptions(null, null, "", null))
                .hasMessage("SENS requires TLS hostname verification");
        assertThatThrownBy(() -> NaverSensSmsSender.validateNetworkOptions(null, null, null, "true"))
                .hasMessage("SENS requires HTTP wire logging to be disabled");
    }

    @Test
    void postPayloadCannotBeSubscribedTwiceEvenWhenTransportAttemptsToRetry() {
        NaverSensSmsSender.SingleUseBodyPublisher publisher = new NaverSensSmsSender.SingleUseBodyPublisher("synthetic".getBytes(StandardCharsets.UTF_8));
        CollectingSubscriber first = new CollectingSubscriber();
        CollectingSubscriber second = new CollectingSubscriber();
        publisher.subscribe(first);
        publisher.subscribe(second);

        assertThat(first.bytes).isEqualTo(9);
        assertThat(first.failure).isNull();
        assertThat(second.bytes).isZero();
        assertThat(second.failure).isInstanceOf(IOException.class)
                .hasMessage("SENS request payload cannot be retransmitted");
    }

    private NaverSensSmsSender sender(NaverSensSmsProperties properties) {
        NaverSensSmsSender sender = new NaverSensSmsSender(properties, JSON, CLOCK, origin);
        clients.add(sender);
        return sender;
    }

    private static NaverSensSmsProperties properties() {
        NaverSensSmsProperties properties = new NaverSensSmsProperties();
        properties.setServiceId("ncp:sms:kr:synthetic:test");
        properties.setAccessKey(ACCESS);
        properties.setSecretKey(SECRET);
        properties.setRegisteredSender(FROM);
        return properties;
    }

    private static Reply accepted() {
        return Reply.json(202, "{\"requestId\":\"" + REQUEST + "\",\"statusCode\":\"202\",\"statusName\":\"success\"}");
    }

    private static String listing(String request, String message, String to) {
        return "{\"statusCode\":\"202\",\"statusName\":\"success\",\"hasMore\":false,\"messages\":[{\"requestId\":\""
                + request + "\",\"messageId\":\"" + message + "\",\"to\":\"" + to + "\"}]}";
    }

    private static String detail(String request, String message, String to, String status, String code, String name) {
        var item = JSON.createObjectNode().put("requestId", request).put("messageId", message)
                .put("to", to).put("status", status);
        if (code != null) item.put("statusCode", code);
        if (name != null) item.put("statusName", name);
        var body = JSON.createObjectNode().put("statusCode", "200").put("statusName", "success");
        body.putArray("messages").add(item);
        return JSON.writeValueAsString(body);
    }

    private static void assertSignature(Request request) throws Exception {
        String timestamp = request.headers().get("x-ncp-apigw-timestamp");
        assertThat(timestamp).isEqualTo(Long.toString(CLOCK.millis()));
        assertThat(request.headers().get("x-ncp-iam-access-key")).isEqualTo(ACCESS);
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String raw = request.method() + " " + request.target() + "\n" + timestamp + "\n" + ACCESS;
        String expected = Base64.getEncoder().encodeToString(mac.doFinal(raw.getBytes(StandardCharsets.UTF_8)));
        assertThat(request.headers().get("x-ncp-apigw-signature-v2")).isEqualTo(expected);
    }

    private void respond(HttpExchange exchange) {
        if (exchange.getRequestMethod().equals("POST")) postCount.incrementAndGet();
        try {
            byte[] body = exchange.getRequestBody().readAllBytes();
            requests.add(new Request(exchange.getRequestMethod(), exchange.getRequestURI().toString(),
                    Map.of("x-ncp-apigw-timestamp", exchange.getRequestHeaders().getFirst("x-ncp-apigw-timestamp"),
                            "x-ncp-iam-access-key", exchange.getRequestHeaders().getFirst("x-ncp-iam-access-key"),
                            "x-ncp-apigw-signature-v2", exchange.getRequestHeaders().getFirst("x-ncp-apigw-signature-v2")),
                    new String(body, StandardCharsets.UTF_8)));
            Reply reply = replies.poll();
            if (reply == null || reply.closeBeforeHeaders()) return;
            if (reply.headerDelayMs() > 0) Thread.sleep(reply.headerDelayMs());
            if (reply.location() != null) exchange.getResponseHeaders().set("Location", reply.location());
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            byte[] response = reply.body().getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(reply.status(), response.length);
            if (reply.bodyDelayMs() > 0) {
                exchange.getResponseBody().write(response, 0, 1);
                exchange.getResponseBody().flush();
                Thread.sleep(reply.bodyDelayMs());
                exchange.getResponseBody().write(response, 1, response.length - 1);
            } else {
                exchange.getResponseBody().write(response);
            }
        } catch (IOException ignored) {
            // Timeout/size-cap fixtures intentionally close the peer before the response completes.
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        } finally {
            exchange.close();
        }
    }

    private record Request(String method, String target, Map<String, String> headers, String body) { }

    private record Reply(int status, String body, int headerDelayMs, int bodyDelayMs, boolean closeBeforeHeaders, String location) {
        static Reply json(int status, String body) { return new Reply(status, body, 0, 0, false, null); }
        static Reply closed() { return new Reply(0, "", 0, 0, true, null); }
    }

    private static final class CollectingSubscriber implements Flow.Subscriber<ByteBuffer> {
        private int bytes;
        private Throwable failure;
        @Override public void onSubscribe(Flow.Subscription subscription) { subscription.request(Long.MAX_VALUE); }
        @Override public void onNext(ByteBuffer item) { bytes += item.remaining(); }
        @Override public void onError(Throwable failure) { this.failure = failure; }
        @Override public void onComplete() { }
    }
}
