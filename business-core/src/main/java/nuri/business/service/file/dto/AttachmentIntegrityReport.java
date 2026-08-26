package nuri.business.service.file.dto;

import java.util.List;

/**
 * 첨부 정합성 점검 결과.
 *
 * @param checked 확인한 첨부 레코드 수
 * @param missing 저장소에 실물이 없는 레코드 수 — <b>0 이 아니면 DB↔저장소가 어긋난 상태</b>다
 * @param samples 조치 대상 예시(저장 경로 단위). 전체가 아니라 상한까지만 담는다 —
 *                전체 규모는 {@code missing} 이 말하고, 예시는 어디부터 볼지 정하는 용도다
 */
public record AttachmentIntegrityReport(
        long checked,
        long missing,
        List<String> samples) {

    /** 어긋난 것이 하나도 없는가. */
    public boolean isHealthy() {
        return missing == 0;
    }
}
