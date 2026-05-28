package nuri.business.service.comment.dto;

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
    private Long commentNo;
    @Size(max = 20)
    private String pstId;
    @Size(max = 20)
    private String bbsId;
    private String writerId;
    private String writerNm;
    private String password;
    private String commentCn;
    private String createdDate;
}
