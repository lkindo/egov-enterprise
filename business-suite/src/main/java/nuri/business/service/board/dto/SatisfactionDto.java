package nuri.business.service.board.dto;

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
    @NotNull(message = "게시물ID는 필수입니다.")
    private Long articleId;
    @NotBlank(message = "게시판ID는 필수입니다.")
    private String boardId;
    private String writerId;
    private String writerNm;
    @NotNull(message = "만족도는 필수입니다.")
    @Min(value = 1, message = "만족도는 1 이상이어야 합니다.")
    @Max(value = 5, message = "만족도는 5 이하여야 합니다.")
    private Integer satisfactionLevel;
    @Size(max = 2000, message = "??껄?? 2000?????????땲??")
    private String satisfactionOpinion;
    private String useAt;
    private String satisfactionPassword;
    private LocalDateTime createdDate;
}
