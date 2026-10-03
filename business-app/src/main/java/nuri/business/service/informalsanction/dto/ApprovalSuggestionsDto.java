package nuri.business.service.informalsanction.dto;

import java.util.List;

/**
 * 기안 화면의 결재선 제안(2026-10-03 결재 동선 개선 B안). 모두 요청한 사람이 직접 올린 결재에서만 계산한다.
 *
 * @param lines            요청한 업무 구분에 쓴 결재선(많이 쓴 순, 최대 3개)
 * @param otherLines       다른 업무 구분에 쓴 결재선(업무 구분마다 가장 많이 쓴 것, 최근 순, 최대 3개)
 * @param recentApprovers  최근 결재선에 넣은 사람(최근 순, 최대 8명)
 */
public record ApprovalSuggestionsDto(List<ApprovalLineSuggestionDto> lines, List<ApprovalLineSuggestionDto> otherLines,
                                     List<ApproverProfileDto> recentApprovers) {
}
