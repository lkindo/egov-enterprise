package com.company.project.service.schedule.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemoTodoDto {
    private String todoId;
    private String todoSubject;
    private String todoCn;
    private String beginTime;
    private String endTime;
    private String writerId;
}
