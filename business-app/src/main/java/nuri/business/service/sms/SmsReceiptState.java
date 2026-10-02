package nuri.business.service.sms;

import java.util.Optional;
import java.util.UUID;

/** Versioned private receipt in existing rsltMsg; no phone, body, secret, or provider prose. */
public record SmsReceiptState(Stage stage, String attempt, String requestId, String messageId,
        long createdAt, long nextPollAt, int polls, SmsGatewayResult.Reason reason) {
    public enum Stage { CLAIMED, ACCEPTED, UNKNOWN, DELIVERED, REJECTED }
    public static final String PREFIX = "egov-sms:v1|";
    public static final String ACCEPTED_PATTERN = PREFIX + "ACCEPTED|%";
    public static final String CLAIMED_PATTERN = PREFIX + "CLAIMED|%";
    static final long CLAIM_TIMEOUT_MS = 120_000;
    static final long RECEIPT_TIMEOUT_MS = 24 * 60 * 60 * 1000L;
    static final int MAX_POLLS = 48;

    public SmsReceiptState {
        java.util.Objects.requireNonNull(stage, "stage");
        java.util.Objects.requireNonNull(reason, "reason");
        UUID.fromString(attempt);
        SmsGatewayResult.requireSafeId(requestId);
        SmsGatewayResult.requireSafeId(messageId);
        if (createdAt < 0 || nextPollAt < 0 || polls < 0 || polls > MAX_POLLS
                || (stage == Stage.ACCEPTED && requestId == null)) {
            throw new IllegalArgumentException("Invalid SMS receipt state");
        }
    }

    public static SmsReceiptState claim(long now) {
        return new SmsReceiptState(Stage.CLAIMED, UUID.randomUUID().toString(), null, null,
                now, now, 0, SmsGatewayResult.Reason.UNCONFIRMED);
    }

    public SmsReceiptState submitted(SmsGatewayResult result, long now) {
        // A port cannot promote POST acceptance into delivery, even if an implementation misreports it.
        Stage target = switch (result.state()) {
            case PENDING -> Stage.ACCEPTED;
            case REJECTED -> Stage.REJECTED;
            case UNKNOWN, DELIVERED -> Stage.UNKNOWN;
        };
        return new SmsReceiptState(target, attempt,
                target == Stage.ACCEPTED ? result.requestId() : null, null,
                createdAt, now, 0, result.state() == SmsGatewayResult.State.DELIVERED
                        ? SmsGatewayResult.Reason.UNCONFIRMED : result.reason());
    }

    public SmsReceiptState pollClaim(long now) {
        // The supported adapter can spend two 30-second HTTP timeouts plus DB recording retries.
        long delay = Math.max(90_000L, Math.min(300_000L, 30_000L * (1L << Math.min(polls, 4))));
        return new SmsReceiptState(stage, attempt, requestId, messageId,
                createdAt, now + delay, polls + 1, reason);
    }

    public boolean expired(long now) {
        return stage == Stage.CLAIMED ? now - createdAt >= CLAIM_TIMEOUT_MS
                : polls >= MAX_POLLS || now - createdAt >= RECEIPT_TIMEOUT_MS;
    }

    public boolean implausibleTiming(long now) {
        return createdAt > now + 60_000L || nextPollAt > now + 360_000L;
    }

    public SmsReceiptState expired() {
        return new SmsReceiptState(Stage.UNKNOWN, attempt, requestId, messageId,
                createdAt, nextPollAt, polls, SmsGatewayResult.Reason.EXPIRED);
    }

    public SmsReceiptState reconciled(SmsGatewayResult result) {
        boolean correlated = (result.requestId() == null || result.requestId().equals(requestId))
                && (messageId == null || result.messageId() == null || messageId.equals(result.messageId()));
        if (!correlated) return lookupFailed();
        Stage target = switch (result.state()) {
            case DELIVERED -> Stage.DELIVERED;
            case REJECTED -> Stage.REJECTED;
            case PENDING, UNKNOWN -> Stage.ACCEPTED;
        };
        // Terminal receipts must identify both the original request and its recipient message.
        if ((target == Stage.DELIVERED || target == Stage.REJECTED)
                && (result.requestId() == null || result.messageId() == null)) return lookupFailed();
        return new SmsReceiptState(target, attempt, requestId,
                result.messageId() == null ? messageId : result.messageId(), createdAt,
                nextPollAt, polls, result.state() == SmsGatewayResult.State.UNKNOWN
                        ? SmsGatewayResult.Reason.LOOKUP_FAILED : result.reason());
    }

    private SmsReceiptState lookupFailed() {
        return new SmsReceiptState(Stage.ACCEPTED, attempt, requestId, messageId,
                createdAt, nextPollAt, polls, SmsGatewayResult.Reason.LOOKUP_FAILED);
    }

    public String resultCode() {
        return switch (stage) { case DELIVERED -> "S"; case REJECTED -> "F"; default -> "P"; };
    }

    public String encode() {
        return PREFIX + stage + "|" + attempt + "|" + nullable(requestId) + "|" + nullable(messageId)
                + "|" + createdAt + "|" + nextPollAt + "|" + polls + "|" + reason;
    }

    public static Optional<SmsReceiptState> parse(String value) {
        if (value == null || !value.startsWith(PREFIX) || value.length() > 1000) return Optional.empty();
        try {
            String[] fields = value.substring(PREFIX.length()).split("\\|", -1);
            if (fields.length != 8) return Optional.empty();
            return Optional.of(new SmsReceiptState(Stage.valueOf(fields[0]), fields[1], absent(fields[2]),
                    absent(fields[3]), Long.parseLong(fields[4]), Long.parseLong(fields[5]),
                    Integer.parseInt(fields[6]), SmsGatewayResult.Reason.valueOf(fields[7])));
        } catch (IllegalArgumentException failure) {
            return Optional.empty();
        }
    }

    /** Only human status reaches the API. Private correlation identities stay in the database. */
    public static String display(String resultCode, String value) {
        var receipt = parse(value);
        if (receipt.isPresent()) {
            return switch (receipt.get().stage) {
                case CLAIMED -> "발송 요청 처리 중입니다. 결과가 확정되기 전에는 다시 보내지 마세요.";
                case ACCEPTED -> "공급자 접수 후 전달 결과를 확인 중입니다.";
                case UNKNOWN -> "발송 결과가 미확정입니다. 공급자에서 확인해 주세요. 자동으로 다시 보내지 않습니다.";
                case DELIVERED -> "수신자에게 전달되었습니다.";
                case REJECTED -> switch (receipt.get().reason) {
                    case UNCONFIGURED -> "실제 문자 발송 공급자가 구성되지 않았습니다.";
                    case INVALID_REQUEST -> "발신 번호 또는 문자 길이·내용 형식이 지원 범위를 벗어났습니다.";
                    default -> "공급자 발송 또는 전달이 거절되었습니다.";
                };
            };
        }
        if (value != null && value.startsWith(PREFIX)) return "발송 결과 확인이 필요합니다. 자동으로 다시 보내지 않습니다.";
        return value;
    }

    private static String nullable(String value) { return value == null ? "" : value; }
    private static String absent(String value) { return value.isEmpty() ? null : value; }

    @Override public String toString() {
        return "SmsReceiptState[stage=" + stage + ", polls=" + polls + ", reason=" + reason + "]";
    }
}
