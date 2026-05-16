package nuri.business.service.comment.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentDto {
    private Long id;
    private Long nttId;
    private String bbsId;
    private String writerId;
    private String writerNm;
    private String cmntCn;
    private String useYn;
    private LocalDateTime createdDate;
    private LocalDateTime modifiedDate;

    // legacy / aliases
    public Long getPstId() { return nttId; }
    public void setPstId(Long v) { this.nttId = v; }
    public Long getAnswerNo() { return id; }
    public void setAnswerNo(Long v) { this.id = v; }
}
