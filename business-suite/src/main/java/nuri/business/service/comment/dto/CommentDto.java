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
    private Long pstId;
    private String bbsId;
    private String writerId;
    private String writerNm;
    private String cmntCn;
    private String useYn;
    private LocalDateTime createdDate;
    private LocalDateTime modifiedDate;

    // Manual getters to bypass potential Lombok issues during refactoring
    public Long getId() {
        return id;
    }

    public Long getPstId() {
        return pstId;
    }

    public String getBbsId() {
        return bbsId;
    }

    public String getWriterId() {
        return writerId;
    }

    public String getWriterNm() {
        return writerNm;
    }

    public String getCmntCn() {
        return cmntCn;
    }

    public String getUseYn() {
        return useYn;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public LocalDateTime getModifiedDate() {
        return modifiedDate;
    }
}
