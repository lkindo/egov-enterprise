package nuri.business.service.comment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor(onConstructor_ = @com.fasterxml.jackson.annotation.JsonCreator)
// ConstructorProperties must not turn response-only primitive flags into JSON creator inputs.
@AllArgsConstructor(onConstructor_ = @com.fasterxml.jackson.annotation.JsonCreator(mode = com.fasterxml.jackson.annotation.JsonCreator.Mode.DISABLED))
@Builder
public class CommentDto {
    private Long ansSn;
    private Long pstSn;
    @Size(max = 20)
    private String bbsId;

    /**
     * 작성자 식별자는 내부 처리에만 사용하며 일반 응답과 요청에서 숨긴다.
     * 표시명은 응답 전용이다.
     *
     * <p>[2026-08-27] 종전에는 요청 본문의 값을 그대로 저장했다. 그런데 화면은 이 두 필드를
     * 보내지 않으므로(commentActions 는 pstSn·bbsId·ansCn 3개만 전송) <b>모든 댓글의 작성자가
     * null 로 저장</b>됐고 목록에서 작성자 칸이 비었다. 게시글은 이미 인증 주체에서 채우는 규칙을
     * 쓴다(BoardService). 같은 규칙을 여기에도 적용하되, 클라이언트가 남의 이름으로 댓글을 다는
     * 위조 경로를 열지 않도록 요청 수용 자체를 막는다.
     */
    @Schema(hidden = true)
    @JsonIgnore
    private String wrterId;
    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String wrterNm;

    /**
     * 등록자 로그인 ID — 서버의 소유권 판정에만 사용하며 JSON과 OpenAPI에서 숨긴다.
     *
     * <p>서버 가드와 같은 loginId 축에서 editable/deletable을 계산한다.
     * 과거 wrterId(esntlId)가 NULL인 댓글도 등록자 값으로 판정하며 UI에는 계산 결과만 제공한다.
     */
    @Schema(hidden = true)
    @JsonIgnore
    private String frstRgtrId;

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private boolean editable;
    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private boolean deletable;

    // [보안] 익명 댓글 비밀번호는 요청(write)으로만 수용, 응답(read)에 직렬화 금지.
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String pswd;
    // [2026-09-22 GAP-CONTRACT-001] 물리 컬럼 4000 을 입력에서 보호한다(만족도 본문과 같은 규칙).
    @Size(max = 4000)
    private String ansCn;
    @Schema(nullable = true, types = {"string", "null"}, accessMode = Schema.AccessMode.READ_ONLY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String crtDt;
}
