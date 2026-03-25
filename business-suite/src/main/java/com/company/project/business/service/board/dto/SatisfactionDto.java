package com.company.project.business.service.board.dto;

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
    @NotNull(message = "寃뚯?臾?ID???꾩닔??땲??")
    private Long articleId;
    @NotBlank(message = "寃뚯???ID???꾩닔??땲??")
    private String boardId;
    private String writerId;
    private String writerNm;
    @NotNull(message = "留뚯????????꾩닔??땲??")
    @Min(value = 1, message = "留뚯???????1????긽??뼱????땲??")
    @Max(value = 5, message = "留뚯???????5????븯??뼱????땲??")
    private Integer satisfactionLevel;
    @Size(max = 2000, message = "??껄?? 2000?????????땲??")
    private String satisfactionOpinion;
    private String useAt;
    private String satisfactionPassword;
    private LocalDateTime createdDate;
}
