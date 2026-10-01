package nuri.business.service.sms;

import java.util.Objects;

/** Provider acceptance is not proof of delivery. Never store provider response text here. */
public record SmsGatewayResult(State state, String requestId, String messageId, Reason reason) {
    public enum State { PENDING, DELIVERED, REJECTED, UNKNOWN }
    public enum Reason {
        ACCEPTED, DELIVERED, PROVIDER_REJECTED, UNCONFIGURED, INVALID_REQUEST,
        UNCONFIRMED, LOOKUP_PENDING, LOOKUP_FAILED, EXPIRED
    }

    public SmsGatewayResult {
        Objects.requireNonNull(state, "state");
        Objects.requireNonNull(reason, "reason");
        requireSafeId(requestId);
        requireSafeId(messageId);
        if ((state == State.PENDING || state == State.DELIVERED) && requestId == null) {
            throw new IllegalArgumentException("SMS receipt requires a request identity");
        }
        if (state == State.DELIVERED && (messageId == null || reason != Reason.DELIVERED)) {
            throw new IllegalArgumentException("SMS delivery requires a completed receipt");
        }
    }

    static void requireSafeId(String value) {
        if (value != null && !value.matches("[A-Za-z0-9_:.~-]{1,160}")) {
            throw new IllegalArgumentException("Invalid SMS receipt identity");
        }
    }

    public static SmsGatewayResult accepted(String requestId) {
        return new SmsGatewayResult(State.PENDING, requestId, null, Reason.ACCEPTED);
    }

    public static SmsGatewayResult pending(String requestId, String messageId) {
        return new SmsGatewayResult(State.PENDING, requestId, messageId, Reason.LOOKUP_PENDING);
    }

    public static SmsGatewayResult delivered(String requestId, String messageId) {
        return new SmsGatewayResult(State.DELIVERED, requestId, messageId, Reason.DELIVERED);
    }

    public static SmsGatewayResult rejected(Reason reason) {
        return rejected(null, null, reason);
    }

    public static SmsGatewayResult rejected(String requestId, String messageId, Reason reason) {
        return new SmsGatewayResult(State.REJECTED, requestId, messageId, reason);
    }

    public static SmsGatewayResult unknown(Reason reason) {
        return new SmsGatewayResult(State.UNKNOWN, null, null, reason);
    }

    @Override
    public String toString() {
        return "SmsGatewayResult[state=" + state + ", reason=" + reason + "]";
    }
}
