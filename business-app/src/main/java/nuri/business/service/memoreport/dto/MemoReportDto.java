package nuri.business.service.memoreport.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "메모보고 정보")
public class MemoReportDto {

    @Schema(description = "메모보고일련번호", nullable = true, types = {"integer", "null"},
            format = "int64", accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long memoRptSn;

    @Schema(description = "보고제목")
    @NotBlank
    @Size(max = 100)
    private String rptTtl;

    @Schema(description = "보고일자")
    @Size(max = 8)
    private String memoRptYmd;

    @Schema(description = "작성자아이디", nullable = true, types = {"string", "null"},
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String userId;

    @Schema(description = "작성자명", nullable = true, types = {"string", "null"},
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    @Size(max = 100)
    private String wrterNm;

    @Schema(description = "보고대상자아이디")
    @NotBlank
    @Size(max = 20)
    private String rptrId;

    @Schema(description = "보고대상자명", nullable = true, types = {"string", "null"},
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String rptrNm;

    @Schema(description = "보고내용")
    @Size(max = 4000)
    private String rptCn;

    @Schema(description = "첨부파일아이디")
    private Long atchFileSn;

    @Schema(description = "지시사항내용", nullable = true, types = {"string", "null"},
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String drctnMttr;

    @Schema(description = "지시사항등록일시", nullable = true, types = {"string", "null"},
            format = "date-time", accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime drctnMttrRegDt;

    @Schema(description = "보고대상자조회일시", nullable = true, types = {"string", "null"},
            format = "date-time", accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime rptrInqDt;

    @Schema(description = "생성일시", nullable = true, types = {"string", "null"},
            format = "date-time", accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime crtDt;

    /**
     * 현재 인증 주체가 이 보고를 수정·삭제할 수 있는지 — <b>서버가 판정한 결과</b>다.
     *
     * <p>[2026-09-08 PD-RPT-001] 화면이 인가를 흉내내지 않게 하려고 판정 결과만 내려준다.
     * 그 인가는 서비스의 {@code assertOwnerOrAdmin(frstRgtrId)} 즉 <b>loginId 축</b>인데,
     * 같은 도메인의 열람 인가는 {@code userId}·{@code rptrId} 즉 <b>esntlId 축</b>이다.
     * 두 축이 다르므로 화면이 응답만 보고 "내가 고칠 수 있는가" 를 계산할 방법이 없었다.
     *
     * <p>대안으로 {@code frstRgtrId}(loginId)를 응답에 싣는 안이 있었으나, 목록 응답에 loginId 가
     * 실리면 계정 열거 표면이 넓어진다. 판정 결과만 보내면 식별자를 노출하지 않는다.
     *
     * <p>이 값은 <b>요청에서 받지 않는다</b> — 서버 판정이므로 클라이언트가 주장할 수 없다.
     * 실제 인가는 여전히 서비스가 집행하며, 이 필드는 화면 표시용 힌트다(백엔드 헌법 제8조의
     * 이중 검증은 그대로다).
     */
    @Schema(description = "현재 사용자가 수정·삭제할 수 있는지(서버 판정)",
            accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Boolean editable;

    // 수기 from(MemoReport) 은 MemoReportMapper(MapStruct, 프레임워크 표준)로 대체됨.
}
