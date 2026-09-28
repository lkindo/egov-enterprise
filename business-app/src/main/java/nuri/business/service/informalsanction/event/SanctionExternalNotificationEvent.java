package nuri.business.service.informalsanction.event;

/** External channels remain best-effort and are requested only after the business commit. */
public record SanctionExternalNotificationEvent(SanctionStatusChangedEvent status) { }
