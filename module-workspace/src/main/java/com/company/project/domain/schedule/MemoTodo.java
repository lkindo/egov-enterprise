package com.company.project.domain.schedule;

import com.company.project.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "NMEMOTODO")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class MemoTodo extends BaseEntity {

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

    public void update(String todoNm, String todoBeginTime, String todoEndTime, String todoCn) {
        this.todoNm = todoNm;
        this.todoBeginTime = todoBeginTime;
        this.todoEndTime = todoEndTime;
        this.todoCn = todoCn;
    }
}
