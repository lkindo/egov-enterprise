package nuri.business.service.informalsanction.dto;

import java.util.List;

/**
 * 내가 올린 결재에서 다시 쓴 결재선 하나. 같은 업무 구분·같은 단계 구성이면 한 줄로 센다.
 *
 * @param useCount   이 결재선으로 올린 문서 수
 * @param lastReqYmd 이 결재선으로 마지막에 올린 문서의 신청일(yyyyMMdd)
 */
public record ApprovalLineSuggestionDto(String taskSeCd, String taskSeNm, int useCount, String lastReqYmd,
                                        List<ApprovalLineStageDto> stages) {
}
