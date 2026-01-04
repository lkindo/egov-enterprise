package com.company.project.domain.schedule;

import com.company.project.domain.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "COMTNMEMOTODO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MemoTodo extends BaseTimeEntity {

    @Id
    @Column(name = "TODO_ID", length = 20)
    private String todoId;

    @Column(name = "TODO_SJ", length = 255, nullable = false)
    private String todoSubject;

    @Column(name = "TODO_CN", length = 2500)
    private String todoCn;

    @Column(name = "TODO_BEGIN_TIME", length = 20)
    private String beginTime;

    @Column(name = "TODO_END_TIME", length = 20)
    private String endTime;

    @Column(name = "WRTER_ID", length = 20, nullable = false)
    private String writerId;

    @Column(name = "FRST_REGISTER_ID", length = 20, updatable = false)
    private String frstRegisterId;

    @Column(name = "LAST_UPDUSR_ID", length = 20)
    private String lastUpdusrId;

    public void update(String todoSubject, String todoCn, String beginTime, String endTime, String lastUpdusrId) {
        this.todoSubject = todoSubject;
        this.todoCn = todoCn;
        this.beginTime = beginTime;
        this.endTime = endTime;
        this.lastUpdusrId = lastUpdusrId;
    }
}
