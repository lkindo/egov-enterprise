package nuri.business.domain.schedule;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.foundation.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_memo_todo_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SuperBuilder
public class MemoTodo extends BaseEntity {

    @Id
    @Column(name = "todo_id", length = 20)
    private String todoId;

    @Column(name = "todo_ttl", length = 100, nullable = false)
    private String todoNm;

    @Column(name = "todo_cn", length = 4000)
    private String todoCn;

    @Column(name = "todo_bgng_tm", length = 6)
    private String todoBeginTime;

    @Column(name = "todo_end_tm", length = 6)
    private String todoEndTime;

    @Column(name = "user_id", length = 20, nullable = false)
    private String wrterId;

    public void update(String todoNm, String todoBeginTime, String todoEndTime, String todoCn) {
        this.todoNm = todoNm;
        this.todoBeginTime = todoBeginTime;
        this.todoEndTime = todoEndTime;
        this.todoCn = todoCn;
    }
}
