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
    @Size(max = 20)
    private String pstId;
    @Size(max = 20)
    private String bbsId;
    private String wrterId;
    private String wrterNm;
    // [보안] 익명 댓글 비밀번호는 요청(write)으로만 수용, 응답(read)에 직렬화 금지.
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String pswd;
    private String ansCn;
    private String crtDt;
}
