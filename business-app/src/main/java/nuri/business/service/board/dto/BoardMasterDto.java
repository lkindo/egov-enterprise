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
    /**
     * 예약 게시(ADR-0040 결정 3·6) — 새 글의 미래 게시 시작일을 받을지. 생성 요청에서 비우면 N 이다. 노출을 늦추는 집행은 이 값과
     * 무관하게 늘 한다.
     */
    @Schema(description = "예약 게시 — Y 면 새 글의 미래 게시 시작일을 받는다(비우면 N)", allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String rsvtPstgPsbltyYn;
    /**
     * 상단 고정 정책(ADR-0040 결정 5·6) — 새 고정을 받는지, 고정 중인 글 수의 상한, 종료일을 비운 고정의 기본 일수. 생성 요청에서
     * 비우면 N·5·30 이다. 고정·해제 자체는 게시판 설정 권한이 아니라 게시글 고정 권한(BOARD_PIN)이 한다.
     */
    @Schema(description = "상단 고정 허용 — Y 면 새 고정을 받는다(비우면 N)", allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String upendFixPsbltyYn;
    @Schema(description = "상단 고정 상한(고정 중인 글 수, 1~100, 비우면 5)")
    @Min(1)
    @Max(100)
    private Integer upendFixUplmtNocs;
    @Schema(description = "상단 고정 기본 일수(종료일을 비우고 고정할 때, 1~365, 비우면 30)")
    @Min(1)
    @Max(365)
    private Integer upendFixBscDayCnt;
    /**
     * 비밀글 정책·추천 받기(ADR-0040 결정 6·7). 생성 요청에서 비우면 NONE·Y(지금 동작)다. 비밀글 정책은 앞으로 저장하는 글에만,
     * 추천 받기는 새 추천에만 적용된다.
     */
    @Schema(description = "비밀글 정책 — NONE 은 작성 화면에 선택이 없고 요청값을 그대로 저장, OPTIONAL 은 글쓴이가 고름, "
            + "REQUIRED 는 서버가 새 글과 고친 글을 비밀글로 저장한다(비우면 NONE)",
            allowableValues = { "NONE", "OPTIONAL", "REQUIRED" })
    @Pattern(regexp = "^(?:NONE|OPTIONAL|REQUIRED)$", message = "{validation.pattern}")
    @Size(max = 12)
    private String prvtPstPlcyCd;
    @Schema(description = "추천 받기 — N 이면 새 추천을 받지 않는다(비우면 Y). 자기 추천 취소는 늘 받는다",
            allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String rcmdtnUseYn;

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
