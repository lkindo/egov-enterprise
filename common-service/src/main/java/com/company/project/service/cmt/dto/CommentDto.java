package com.company.project.service.cmt.dto;

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
}
