package nuri.business.service.informalsanction.dto;

import java.time.LocalDateTime;

/** 아직 답하지 않은 보완 요청. 요청한 결재자가 차례인 동안만 열려 있다. */
public record ApprovalSupplementDto(String askedBy, String askedByNm, String question, LocalDateTime askedAt) {
}
