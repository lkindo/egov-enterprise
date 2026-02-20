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
    @NotNull(message = "寃뚯떆臾?ID???꾩닔?낅땲??")
    private Long articleId;
    @NotBlank(message = "寃뚯떆??ID???꾩닔?낅땲??")
    private String boardId;
    private String writerId;
    private String writerNm;
    @NotNull(message = "留뚯”???먯닔???꾩닔?낅땲??")
    @Min(value = 1, message = "留뚯”???먯닔??1???댁긽?댁뼱???⑸땲??")
    @Max(value = 5, message = "留뚯”???먯닔??5???댄븯?댁뼱???⑸땲??")
    private Integer satisfactionLevel;
    @Size(max = 2000, message = "?섍껄? 2000???대궡?ъ빞 ?⑸땲??")
    private String satisfactionOpinion;
    private String useAt;
    private String satisfactionPassword;
    private LocalDateTime createdDate;
}
