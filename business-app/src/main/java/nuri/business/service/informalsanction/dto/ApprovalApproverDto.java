package nuri.business.service.informalsanction.dto;

import nuri.business.domain.informalsanction.ApprovalStatus;

import java.time.LocalDateTime;

/**
 * {@code absent}: 부재 중(2026-10-03 결재 동선 개선) — 결재선을 보는 사람이 늦어질 차례를 미리 안다.
 * {@code substituteId}·{@code substituteNm}: 원결재자 대신 이 줄을 결정한 대리결재자(V2_151, 본인이 결정했으면 null).
 */
public record ApprovalApproverDto(String userId, String userNm, ApprovalStatus status,
                                  String opinion, LocalDateTime decidedAt, boolean absent,
                                  String substituteId, String substituteNm) {

    /** 대리결재가 없는 줄. */
    public ApprovalApproverDto(String userId, String userNm, ApprovalStatus status,
                               String opinion, LocalDateTime decidedAt, boolean absent) {
        this(userId, userNm, status, opinion, decidedAt, absent, null, null);
    }
}
