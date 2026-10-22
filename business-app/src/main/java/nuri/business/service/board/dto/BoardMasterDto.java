package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BoardMasterDto {

    @Size(max = 20)
    private String bbsId;
    @Size(max = 100)
    @NotBlank
    private String bbsTtl;
    @Size(max = 4000)
    private String bbsExpln;
    @Size(max = 12)
    @NotBlank
    /** 게시판 유형 코드. 이름은 서버가 싣지 않는다 — 정본은 frontend/src/lib/board/board-types.ts 다(DEC-OPS-332). */
    private String bbsTypeCd;
    @Size(max = 12)
    @NotBlank
    private String bbsAtrbCd;
    private String bbsAtrbCdNm; // 조인 컬럼명 표준화
    @Schema(allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String ansPsbltyYn;
    @Schema(allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String fileAtchPsbltyYn;
    private Integer atchPsbltyFileQty;
    @NotNull
    private Long atchPsbltyFileSz;
    @Size(max = 20)
    private String tmpltId;
    private String frstRgtrId;
    private LocalDateTime crtDt;
    private String lastMdfrId;
    private LocalDateTime mdfcnDt;
    @Schema(allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    @NotBlank
    private String useYn;
    private Long cmntySn;
    @Schema(allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String ansYn;
    @Schema(allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String stsfdgYn;

    // Additional fields for completeness
    private String authFlag;
    private String tmplatCours;

    /**
     * 낙관적 잠금 버전(V2_139). 상세 응답이 싣고, 생성 요청에서는 받지 않는다(JSON 에 보이지 않는다). 수정은 이 DTO 가 아니라
     * {@link BoardMasterUpdateRequest} 가 버전을 받는다(ADR-0040 결정 10).
     */
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Integer version;
}
