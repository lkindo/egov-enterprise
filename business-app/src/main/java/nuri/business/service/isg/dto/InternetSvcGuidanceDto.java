package nuri.business.service.isg.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;

/**
 * 인터넷 서비스 안내 요청·응답 DTO ({@code tb_intrn_svc}).
 *
 * <p>[2026-09-07] 필드 어휘를 엔티티·물리 컬럼·표준용어에 맞춰 정합했다. 종전에는 DTO 만
 * {@code intnetSvcNm}·{@code intnetSvcDc}·{@code reflctAt} 를 써서 서비스가 세 쌍을 수기로 매핑했고,
 * 그 불일치 때문에 이름 기반으로 동작하는 {@code InputContractMirrorLinter} 표적에 편입할 수 없었다
 * (GAP-CONTRACT-001). V2_51 이 등록한 표준용어는 {@code ITNT_SRVC_SN} 이며 나머지 컬럼도 {@code ITNT_*} 다.
 *
 * <p>이 도메인은 2026-09-07 까지 프런트 소비자가 0 이었으므로 필드명 변경의 하위 호환 부담이 없다.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InternetSvcGuidanceDto {

    @Schema(nullable = true, types = {"integer", "null"}, format = "int64",
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long itntSrvcSn;

    // 물리 컬럼 tb_intrn_svc.itnt_svc_nm varchar(100) 미러. @NotBlank 는 제품 규칙이다(컬럼은 nullable)
    // — 이름 없는 안내는 목록에서 빈 행으로 보인다.
    @NotBlank(message = "인터넷 서비스 명칭은 필수입니다.")
    @Size(max = 100, message = "인터넷 서비스 명칭은 100자 이내여야 합니다.")
    private String itntSvcNm;

    // [2026-09-07] 1000 → 4000. 물리 컬럼과 엔티티는 varchar(4000) 인데 DTO 만 1000 이라
    //   컬럼 용량의 75% 를 API 로 쓸 수 없었다. 계약이 물리 스키마보다 좁으면 실패하지는 않지만
    //   "허용되지 않는다" 고 공표한 값이 실제로는 저장 가능하다 — 양방향 모두 미러가 아니다.
    @NotBlank(message = "인터넷 서비스 설명은 필수입니다.")
    @Size(max = 4000, message = "인터넷 서비스 설명은 4000자 이내여야 합니다.")
    private String itntSvcExpln;

    @Size(max = 1, message = "반영 여부는 1자여야 합니다.")
    private String rfltYn;

    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String lastMdfrId;

    // [2026-09-07] 종전 이름은 regDate 였는데 담기는 값은 mdfcnDt(수정일시)였다 — 이름이 사실과 달랐다.
    @Schema(nullable = true, types = {"string", "null"}, format = "date-time",
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime mdfcnDt;
}
