package nuri.business.service.file.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/**
 * 첨부 정합성 점검 결과 — 양방향.
 *
 * <p><b>정방향</b>({@code checked}/{@code missing}): DB 레코드가 가리키는 실물이 저장소에 있는가.
 * <b>역방향</b>({@code storedFilesChecked}/{@code orphanCandidates}): 저장소의 실물을 가리키는
 * DB 레코드가 있는가. 두 방향은 원인이 다르다 — 전자는 유실·경로 변경, 후자는 커밋되지 않은
 * 업로드·외부 복원이다.
 *
 * @param checked            확인한 첨부 레코드 수
 * @param missing            저장소에 실물이 없는 레코드 수 — <b>0 이 아니면 DB↔저장소가 어긋난 상태</b>다
 * @param samples            조치 대상 예시(저장 경로 단위). 전체가 아니라 상한까지만 담는다
 * @param storageRoot        실제로 훑은 저장소 루트의 <b>절대 경로</b>. 설정 기본값이 상대 경로라
 *                           프로세스 작업 디렉터리에 따라 다른 트리를 볼 수 있다 — 어느 트리를 본
 *                           결과인지 모르면 이 보고서는 해석할 수 없다
 * @param storedFilesChecked 저장소에서 확인한 실물 수
 * @param orphanCandidates   대응하는 DB 레코드를 찾지 못한 실물 수. ⚠ <b>확정이 아니라 후보</b>다 —
 *                           커밋 전 업로드가 같은 모습이므로, 지우기 전에 시간을 두고 다시 점검한다
 * @param undecidable        규약 밖이라 판정하지 않은 항목 수(구 문자열 키 디렉터리, 열거 실패 등).
 *                           <b>고아로 세지 않는다</b> — 모르는 것을 고아라고 부르면 사람이 지운다
 * @param orphanSamples      후보·판정 불가 예시(저장 경로 단위)
 */
/*
 * 모든 항목을 required 로 명시한다 — 서버는 언제나 전부 싣는다(원시 타입과 빈 목록).
 * 명시하지 않으면 생성 타입이 전부 optional 이 되고, 소비자가 `?? 0` 으로 메워
 * "세지 않은 것" 과 "0" 이 화면에서 같아진다.
 */
public record AttachmentIntegrityReport(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        long checked,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        long missing,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        List<String> samples,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        String storageRoot,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        long storedFilesChecked,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        long orphanCandidates,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        long undecidable,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        List<String> orphanSamples) {

    /**
     * 어긋난 것이 하나도 없는가.
     *
     * <p>고아 <b>후보</b>는 건강 판정에 넣지 않는다 — 커밋 전 업로드가 같은 모습이라 정상 운영
     * 중에도 0 이 아닐 수 있고, 그것으로 경보를 울리면 경보가 무시된다. 판정 불가도 마찬가지다.
     */
    public boolean isHealthy() {
        return missing == 0;
    }
}
