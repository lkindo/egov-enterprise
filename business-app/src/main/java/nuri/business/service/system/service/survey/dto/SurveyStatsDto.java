package nuri.business.service.system.service.survey.dto;

import lombok.Builder;

/**
 * 문항별 항목 응답 분포 1행 — <b>(문항 × 항목)</b> 단위의 평면 행이며 중첩 구조가 아니다.
 *
 * <p>프론트 {@code SurveyResultStats}(`types/business/survey.ts`)와 필드명이 <b>정확히</b>
 * 대응해야 한다. 종전에 통계 화면 두 벌이 같은 응답을 각각 {@code count}/{@code percentage} 와
 * {@code respondCnt}/{@code qustnrPercent} 로 읽고 있었고(양쪽 다 `as any`), 백엔드가 없어
 * 어느 쪽이 맞는지 판정할 근거조차 없었다. 이 DTO 가 그 SSOT 다 — 표준은 {@code count}/{@code percentage}.
 *
 * <p>주관식 문항은 항목이 없으므로 {@code artclCn} 이 null 이다.
 */
@Builder
public record SurveyStatsDto(
        /** 문항 일련번호 */
        Long srvyQstnSn,
        /** 문항 내용 */
        String qstnCn,
        /** 문항 유형 코드 ('1'=객관식) */
        String qstnTypeCd,
        /** 항목 일련번호 */
        Long srvyArtclSn,
        /** 항목 내용. 주관식이면 null */
        String artclCn,
        /** 해당 항목 응답 수 */
        long count,
        /** 문항 내 응답 비율(%). 문항 응답이 0건이면 0 */
        double percentage
) {
}
