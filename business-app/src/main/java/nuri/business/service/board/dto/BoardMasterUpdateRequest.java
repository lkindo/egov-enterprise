package nuri.business.service.board.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 게시판 설정 수정 요청(ADR-0040 결정 10·§5.5). 생성 요청({@link BoardMasterDto})과 나눈다.
 *
 * <p>템플릿·유형·속성 코드·커뮤니티 귀속은 만든 뒤 바꾸지 않으므로 필드로 두지 않는다 — 보내면 모르는 필드라 400 이다.
 * 템플릿을 바꾸면 쌓인 글의 화면 형태가 소급해 바뀌고, 귀속을 바꾸면 쌓인 글의 열람 범위가 소급해 바뀐다(GAP-CMTY-001, H3).
 * 그 밖의 선택 항목은 보내지 않으면 지금 값을 유지한다. 버전은 상세 조회에서 받은 값을 그대로 돌려보낸다(다르면 409).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "게시판 설정 수정 요청 — 템플릿·유형·속성·커뮤니티 귀속은 바꾸지 않는다")
public class BoardMasterUpdateRequest {

    @Schema(description = "게시판 명칭", maxLength = 100)
    @NotBlank
    @Size(max = 100)
    private String bbsTtl;

    @Schema(description = "게시판 소개", maxLength = 4000)
    @Size(max = 4000)
    private String bbsExpln;

    @Schema(description = "답글 허용", allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String ansPsbltyYn;

    @Schema(description = "파일 첨부 허용", allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String fileAtchPsbltyYn;

    @Schema(description = "첨부 파일 수(0 은 상한 없음)")
    private Integer atchPsbltyFileQty;

    @Schema(description = "파일당 크기(바이트)")
    @NotNull
    private Long atchPsbltyFileSz;

    @Schema(description = "게시판 사용", allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    @NotBlank
    private String useYn;

    @Schema(description = "댓글 받기", allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String ansYn;

    @Schema(description = "만족도 평가 받기", allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String stsfdgYn;

    @Schema(description = "예약 게시 — Y 면 새 글의 미래 게시 시작일을 받는다. 바꿔도 이미 있는 글의 노출은 바뀌지 않는다",
            allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String rsvtPstgPsbltyYn;

    @Schema(description = "상단 고정 허용 — Y 면 새 고정을 받는다. 끄거나 상한을 낮춰도 이미 고정된 글은 종료일까지 그대로다",
            allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String upendFixPsbltyYn;

    @Schema(description = "상단 고정 상한(고정 중인 글 수, 1~100). 새 고정만 이 상한을 따른다")
    @Min(1)
    @Max(100)
    private Integer upendFixUplmtNocs;

    @Schema(description = "상단 고정 기본 일수(종료일을 비우고 고정할 때, 1~365)")
    @Min(1)
    @Max(365)
    private Integer upendFixBscDayCnt;

    @Schema(description = "비밀글 정책 — NONE 은 작성 화면에 선택이 없고 요청값을 그대로 저장, OPTIONAL 은 작성 화면에서 글쓴이가 고름, "
            + "REQUIRED 는 서버가 새 글과 고친 글을 비밀글로 저장한다. 바꿔도 이미 있는 글의 비밀 여부는 그대로다",
            allowableValues = { "NONE", "OPTIONAL", "REQUIRED" })
    @Pattern(regexp = "^(?:NONE|OPTIONAL|REQUIRED)$", message = "{validation.pattern}")
    @Size(max = 12)
    private String prvtPstPlcyCd;

    @Schema(description = "추천 받기 — N 이면 새 추천을 받지 않는다. 이미 받은 추천 수는 그대로이고 각자 자기 추천 취소는 받는다",
            allowableValues = { "Y", "N" })
    @Pattern(regexp = "^(?:Y|N)$", message = "{validation.pattern}")
    @Size(max = 1)
    private String rcmdtnUseYn;

    @Schema(description = "화면이 읽은 게시판 버전. 다르면 다른 사람이 먼저 고친 것이라 409 다")
    @NotNull
    @Min(0)
    private Integer version;
}
