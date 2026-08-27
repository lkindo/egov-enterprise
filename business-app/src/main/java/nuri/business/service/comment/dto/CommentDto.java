package nuri.business.service.comment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentDto {
    private Long ansSn;
    private Long pstSn;
    @Size(max = 20)
    private String bbsId;

    /**
     * 작성자 식별자·성명 — <b>응답 전용</b>이다(위 pswd 의 WRITE_ONLY 와 거울상).
     *
     * <p>[2026-08-27] 종전에는 요청 본문의 값을 그대로 저장했다. 그런데 화면은 이 두 필드를
     * 보내지 않으므로(commentActions 는 pstSn·bbsId·ansCn 3개만 전송) <b>모든 댓글의 작성자가
     * null 로 저장</b>됐고 목록에서 작성자 칸이 비었다. 게시글은 이미 인증 주체에서 채우는 규칙을
     * 쓴다(BoardService). 같은 규칙을 여기에도 적용하되, 클라이언트가 남의 이름으로 댓글을 다는
     * 위조 경로를 열지 않도록 요청 수용 자체를 막는다.
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String wrterId;
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String wrterNm;

    /**
     * 등록자 로그인 ID — <b>응답 전용</b>. 화면의 수정·삭제 버튼 노출 판정에 쓴다.
     *
     * <p>서버 가드({@code SecurityUtil.assertOwnerOrAdmin})가 보는 필드와 <b>같은 축</b>이어야 한다.
     * wrterId(esntlId)로 판정하면 서버가 검사하는 값과 다른 값으로 표시를 정하게 되고, 이 변경 이전에
     * 저장된 행은 wrterId 가 NULL 이라 본인 댓글인데 버튼이 사라진다.
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String frstRgtrId;

    // [보안] 익명 댓글 비밀번호는 요청(write)으로만 수용, 응답(read)에 직렬화 금지.
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String pswd;
    private String ansCn;
    private String crtDt;
}
