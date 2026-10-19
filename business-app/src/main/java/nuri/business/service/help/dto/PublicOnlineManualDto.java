package nuri.business.service.help.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.domain.help.OnlineManual;

/**
 * 일반 사용자가 읽는 온라인 매뉴얼 한 건(2026-10-19). 관리 화면의 {@link OnlineManualDto} 와 달리 등록자 ID·등록 일시·구분
 * 코드를 싣지 않는다 — 매뉴얼을 읽는 데 필요 없고, 등록자 ID 는 관리자 계정의 로그인 ID 다.
 */
@Schema(description = "일반 사용자용 온라인 매뉴얼")
public record PublicOnlineManualDto(
        @Schema(description = "온라인 매뉴얼 일련번호", example = "1", requiredMode = Schema.RequiredMode.REQUIRED)
        Long onlnMnlSn,
        @Schema(description = "온라인 매뉴얼 명", requiredMode = Schema.RequiredMode.REQUIRED)
        String onlnMnlNm,
        @Schema(description = "온라인 매뉴얼 정의(관리 화면의 리소스 경로)", nullable = true, types = {"string", "null"})
        String onlnMnlDfn,
        @Schema(description = "온라인 매뉴얼 설명", nullable = true, types = {"string", "null"})
        String onlnMnlExpln) {

    public static PublicOnlineManualDto from(OnlineManual source) {
        return new PublicOnlineManualDto(source.getOnlnMnlSn(), source.getOnlnMnlNm(), source.getOnlnMnlDfn(),
                source.getOnlnMnlExpln());
    }
}
