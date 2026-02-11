package com.company.project.service.board.dto;

import lombok.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SatisfactionDto {
    private Long satisfactionId;
    @NotNull(message = "게시물 ID는 필수입니다.")
    private Long articleId;
    @NotBlank(message = "게시판 ID는 필수입니다.")
    private String boardId;
    private String writerId;
    private String writerNm;
    @NotNull(message = "만족도 점수는 필수입니다.")
    @Min(value = 1, message = "만족도 점수는 1점 이상이어야 합니다.")
    @Max(value = 5, message = "만족도 점수는 5점 이하이어야 합니다.")
    private Integer satisfactionLevel;
    @Size(max = 2000, message = "의견은 2000자 이내여야 합니다.")
    private String satisfactionOpinion;
    private String useAt;
    private String satisfactionPassword;
    private LocalDateTime createdDate;
}
