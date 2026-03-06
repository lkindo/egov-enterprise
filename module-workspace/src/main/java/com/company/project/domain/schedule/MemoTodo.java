package com.company.project.domain.schedule;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "NMEMOTODO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MemoTodo extends BaseTimeEntity {

    @Id
    @Column(name = "TODO_ID", length = 20)
    private String todoId;

    @Column(name = "TODO_SJ", length = 255, nullable = false)
    private String todoNm;

    @Column(name = "TODO_CN", length = 2500)
    private String todoCn;

    @Column(name = "TODO_BEGIN_TIME", length = 20)
    private String todoBeginTime;

    @Column(name = "TODO_END_TIME", length = 20)
    private String todoEndTime;

    @Column(name = "WRTER_ID", length = 20, nullable = false)
    private String wrterId;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String todoNm, String todoBeginTime, String todoEndTime, String todoCn, String lastUpdusrId) {
        this.todoNm = todoNm;
        this.todoBeginTime = todoBeginTime;
        this.todoEndTime = todoEndTime;
        this.todoCn = todoCn;
        this.lastUpdusrId = lastUpdusrId;
    }
}
