package nuri.business.service.comment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentDto {
    private Long commentNo;
    private String pstId;
    private String bbsId;
    private String writerId;
    private String writerNm;
    private String password;
    private String commentCn;
    private String createdDate;
}
