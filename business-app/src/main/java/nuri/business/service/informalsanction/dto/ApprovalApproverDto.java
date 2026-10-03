package nuri.business.service.informalsanction.dto;

import nuri.business.domain.informalsanction.ApprovalStatus;

import java.time.LocalDateTime;

/** {@code absent}: 부재 중(2026-10-03 결재 동선 개선) — 결재선을 보는 사람이 늦어질 차례를 미리 안다. */
public record ApprovalApproverDto(String userId, String userNm, ApprovalStatus status,
                                  String opinion, LocalDateTime decidedAt, boolean absent) {
}
