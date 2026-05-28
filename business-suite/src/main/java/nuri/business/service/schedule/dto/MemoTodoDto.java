package nuri.business.service.schedule.dto;

import jakarta.validation.constraints.*;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemoTodoDto {
    @Size(max = 20)
    private String todoId;
    @Size(max = 100)
    @NotBlank
    private String todoTtl;
    @Size(max = 4000)
    private String todoCn;
    @Size(max = 6)
    private String todoBgngTm;
    @Size(max = 6)
    private String todoEndTm;
    @Size(max = 20)
    @NotBlank
    private String userId;
    private String frstRegisterId;
}
