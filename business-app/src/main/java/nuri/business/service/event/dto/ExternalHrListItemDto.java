package nuri.business.service.event.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.domain.event.ExternalHr;
import nuri.foundation.core.util.PiiMaskUtil;

import java.time.LocalDateTime;

/**
 * 외부인사 목록 조회용 응답 전용 DTO — 목록 응답에서는 생년월일·전화번호·이메일을 마스킹한다.
 *
 * <p>목록 응답에서 마스킹한 값이 {@link ExternalHrDto} 의 입력 제약(@Pattern 생년월일 형식)과
 * 충돌하지 않도록 분리하며, 원문 조회는 정보주체를 기록하는 단건 상세({@code GET /{evntSn}/{otsdHrId}})로 한정한다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "외부인사 목록 응답 항목(민감 연락처·생년월일 마스킹)")
public record ExternalHrListItemDto(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Long evntSn,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String otsdHrId,
        String gndrCd,
        String otsdHrNm,
        String crTypeCd,
        String ogdpInstNm,
        @Schema(description = "마스킹된 생년월일(예: 1990****). 원문은 상세 조회에서만 나간다.") String brdtYmd,
        String areaNo,
        @Schema(description = "마스킹된 전화번호 가운데 자리(예: ****). 원문은 상세 조회에서만 나간다.") String mdTelno,
        String endTelno,
        @Schema(description = "마스킹된 이메일(예: ho***@example.com). 원문은 상세 조회에서만 나간다.") String emlAddr,
        @Schema(accessMode = Schema.AccessMode.READ_ONLY) LocalDateTime crtDt,
        @Schema(accessMode = Schema.AccessMode.READ_ONLY) String frstRgtrId,
        @Schema(accessMode = Schema.AccessMode.READ_ONLY) LocalDateTime mdfcnDt,
        @Schema(accessMode = Schema.AccessMode.READ_ONLY) String lastMdfrId,
        Integer version
) {

    public static ExternalHrListItemDto from(ExternalHr hr) {
        if (hr == null) {
            return null;
        }
        return new ExternalHrListItemDto(
                hr.getEvntSn(),
                hr.getOtsdHrId(),
                hr.getGndrCd(),
                hr.getOtsdHrNm(),
                hr.getCrTypeCd(),
                hr.getOgdpInstNm(),
                maskBirthDate(hr.getBrdtYmd()),
                hr.getAreaNo(),
                maskMiddleTel(hr.getMdTelno()),
                hr.getEndTelno(),
                maskEmail(hr.getEmlAddr()),
                hr.getCrtDt(),
                hr.getFrstRgtrId(),
                hr.getMdfcnDt(),
                hr.getLastMdfrId(),
                hr.getVersion()
        );
    }

    private static String maskBirthDate(String brdtYmd) {
        if (brdtYmd == null || brdtYmd.isBlank()) {
            return brdtYmd;
        }
        return brdtYmd.length() >= 4 ? brdtYmd.substring(0, 4) + "****" : "****";
    }

    private static String maskMiddleTel(String mdTelno) {
        if (mdTelno == null || mdTelno.isBlank()) {
            return mdTelno;
        }
        return "****";
    }

    private static String maskEmail(String emlAddr) {
        if (emlAddr == null || emlAddr.isBlank()) {
            return emlAddr;
        }
        return PiiMaskUtil.email(emlAddr);
    }
}
