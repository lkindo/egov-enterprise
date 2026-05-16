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
    private String cmntCn;
    private String password;

    // legacy
    public Long getPstId() { return nttId; }
    public void setPstId(Long v) { this.nttId = v; }
}
