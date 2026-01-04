package com.company.project.service.board.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SatisfactionDto {
    private String satisfactionId;
    private Long articleId;
    private String boardId;
    private String writerId;
    private String writerNm;
    private Integer satisfactionLevel;
    private String satisfactionOpinion;
    private String useAt;
    private String satisfactionPassword;
    private LocalDateTime createdDate;
}
