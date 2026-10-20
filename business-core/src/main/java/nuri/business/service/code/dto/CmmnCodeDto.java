package nuri.business.service.code.dto;

import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "공통 코드 DTO")
public class CmmnCodeDto {

    @Schema(description = "코드 ID")
    @Size(max = 20)
    private String cdId;

    @Schema(description = "코드 ID명")
    @Size(max = 100)
    private String cdIdNm;

    @Schema(description = "코드 ID 설명")
    @Size(max = 4000)
    private String cdIdExpln;

    @Schema(description = "분류코드")
    @Size(max = 12)
    private String clsfCd;

    @Schema(description = "분류코드명")
    @Size(max = 100)
    private String clsfCdNm;

    @Schema(description = "사용여부", allowableValues = {"Y", "N"})
    @Size(max = 1)
    @NotBlank
    @Pattern(regexp = "^(?:Y|N)$")
    private String useYn;

    @Schema(description = "최초등록자 ID")
    private String frstRgtrId;

    @Schema(description = "최종수정자 ID")
    private String lastMdfrId;

    @Schema(description = "낙관적 잠금 버전(V2_133). 조회한 값을 수정 요청에 그대로 돌려보내며 수정할 때 필수다 — 다르면 409. 등록에서는 무시한다.")
    @Min(0)
    private Integer version;

    /*
     * [2026-10-20] 이 제품이 이 그룹을 읽는 곳(사용처). 기능별 CommonCodeUsageContributor 기여에서 서버가 채우고, 빈 목록이면
     * 이 제품이 읽지 않는 그룹이다. 요청에 실어 보내도 무시한다(등록·수정은 이 값을 읽지 않는다).
     */
    @Schema(description = "이 제품이 이 그룹을 읽는 곳(사용처) 문장. 빈 목록이면 이 제품이 읽지 않는 그룹이다. 서버가 채우며 요청 값은 무시한다.",
            accessMode = Schema.AccessMode.READ_ONLY)
    private java.util.List<String> usages;

}

