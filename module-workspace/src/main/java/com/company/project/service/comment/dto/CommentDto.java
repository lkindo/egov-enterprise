package com.company.project.service.comment.dto;

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
    private String wrterId;
    private String wrterNm;
    private String commentCn;
    private String useAt;
    private LocalDateTime createdDate;
    private LocalDateTime modifiedDate;

    // Manual getters to bypass Lombok issues
    public Long getId() {
        return id;
    }

    public Long getNttId() {
        return nttId;
    }

    public String getBbsId() {
        return bbsId;
    }

    public String getWrterId() {
        return wrterId;
    }

    public String getWrterNm() {
        return wrterNm;
    }

    public String getCommentCn() {
        return commentCn;
    }

    public String getUseAt() {
        return useAt;
    }

    public LocalDateTime getCreatedDate() {
        return createdDate;
    }

    public LocalDateTime getModifiedDate() {
        return modifiedDate;
    }
}
