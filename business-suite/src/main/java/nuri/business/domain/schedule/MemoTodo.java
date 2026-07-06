package nuri.business.domain.schedule;
import jakarta.persistence.EntityListeners;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import nuri.business.domain.common.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 메모 할일 엔티티 (tb_memo_todo_info)
 *
 * <p>[Phase 5.2 규범] 클래스 레벨 @SuperBuilder 제거, 빌더는 정적 팩토리 {@link #create}에 @Builder 배치.
 */
@EntityListeners(AuditingEntityListener.class)
@Entity
@Table(name = "tb_memo_todo_info")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemoTodo extends BaseEntity {

    @Id
    @Column(length = 20)
    private String todoId;

    @Column(length = 100, nullable = false)
    private String todoTtl;

    @Column(length = 4000)
    private String todoCn;

    @Column(length = 6)
    private String todoBgngTm;

    @Column(length = 6)
    private String todoEndTm;

    @Column(length = 20, nullable = false)
    private String userId;

    private MemoTodo(String todoId, String todoTtl, String todoCn, String todoBgngTm,
            String todoEndTm, String userId) {
        this.todoId = todoId;
        this.todoTtl = todoTtl;
        this.todoCn = todoCn;
        this.todoBgngTm = todoBgngTm;
        this.todoEndTm = todoEndTm;
        this.userId = userId;
    }

    @Builder
    public static MemoTodo create(String todoId, String todoTtl, String todoCn, String todoBgngTm,
            String todoEndTm, String userId) {
        return new MemoTodo(todoId, todoTtl, todoCn, todoBgngTm, todoEndTm, userId);
    }

    public void update(String todoTtl, String todoBgngTm, String todoEndTm, String todoCn) {
        this.todoTtl = todoTtl;
        this.todoBgngTm = todoBgngTm;
        this.todoEndTm = todoEndTm;
        this.todoCn = todoCn;
    }
}
