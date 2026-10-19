package nuri.business.service.help.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.domain.help.Hpcm;

/**
 * 일반 사용자가 읽는 도움말 한 건(2026-10-19). 관리 화면의 {@link HpcmDto} 와 달리 등록자 ID·등록 일시를 싣지 않는다 —
 * 도움말을 읽는 데 필요 없고, 등록자 ID 는 관리자 계정의 로그인 ID 다. 분류 구분 코드도 화면이 쓰지 않아 뺀다.
 */
@Schema(description = "일반 사용자용 도움말")
public record PublicHpcmDto(
        @Schema(description = "도움말 일련번호", example = "1", requiredMode = Schema.RequiredMode.REQUIRED)
        Long hlpSn,
        @Schema(description = "도움말 정의(제목)", requiredMode = Schema.RequiredMode.REQUIRED)
        String hlpDfn,
        @Schema(description = "도움말 설명", nullable = true, types = {"string", "null"})
        String hlpExpln) {

    public static PublicHpcmDto from(Hpcm source) {
        return new PublicHpcmDto(source.getHlpSn(), source.getHlpDfn(), source.getHlpExpln());
    }
}
