package nuri.business.service.schedule.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemoTodoDto {
    private String todoId;
    private String todoTtl;
    private String todoCn;
    private String todoBgngTm;
    private String todoEndTm;
    private String userId;
    private String frstRegisterId;
}
