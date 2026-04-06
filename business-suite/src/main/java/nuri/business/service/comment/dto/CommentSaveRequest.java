package nuri.business.service.comment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentSaveRequest {
    @NotNull
    private Long nttId;
    @NotBlank
    private String bbsId;
    @NotBlank
    private String commentCn;
    private String password;
}
