package nuri.business.service.informalsanction.dto;

import nuri.business.domain.informalsanction.ApprovalStageKind;

import java.util.List;

/** 제안 결재선의 한 단계. 단계 안의 사람은 동시에 결재한다. */
public record ApprovalLineStageDto(ApprovalStageKind kind, List<ApproverProfileDto> approvers) {
}
