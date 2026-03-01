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
    @NotNull(message = "å¯ƒëš¯?†è‡¾?ID???ê¾©ë‹”??…ë•²??")
    private Long articleId;
    @NotBlank(message = "å¯ƒëš¯???ID???ê¾©ë‹”??…ë•²??")
    private String boardId;
    private String writerId;
    private String writerNm;
    @NotNull(message = "ï§ëš¯????ë¨?‹”???ê¾©ë‹”??…ë•²??")
    @Min(value = 1, message = "ï§ëš¯????ë¨?‹”??1????ê¸½??ë¼±????¸ë•²??")
    @Max(value = 5, message = "ï§ëš¯????ë¨?‹”??5????„ë¸¯??ë¼±????¸ë•²??")
    private Integer satisfactionLevel;
    @Size(max = 2000, message = "??ê»„?? 2000????€ê¶??ë¹???¸ë•²??")
    private String satisfactionOpinion;
    private String useAt;
    private String satisfactionPassword;
    private LocalDateTime createdDate;
}
