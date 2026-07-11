package nuri.business.domain.schedule;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.lang.reflect.Constructor;
import static org.junit.jupiter.api.Assertions.*;

class MemoTodoTest {

    @Test
    @DisplayName("MemoTodo 엔티티 생성자, 빌더 및 비즈니스 갱신 100% 검증")
    void memoTodo_all_features_test() throws Exception {
        // 1. 기본 생성자 (Protected) 검증
        Constructor<MemoTodo> noArgConstructor = MemoTodo.class.getDeclaredConstructor();
        noArgConstructor.setAccessible(true);
        MemoTodo todo1 = noArgConstructor.newInstance();
        assertNotNull(todo1);

        // 2. SuperBuilder 검증
        MemoTodo todo2 = MemoTodo.builder()
                .todoId("T1")
                .todoTtl("Title")
                .todoCn("Content")
                .todoBgngTm("090000")
                .todoEndTm("180000")
                .userId("User1")
                .build();
        assertEquals("T1", todo2.getTodoId());
        assertEquals("Title", todo2.getTodoTtl());
        assertEquals("Content", todo2.getTodoCn());
        assertEquals("090000", todo2.getTodoBgngTm());
        assertEquals("180000", todo2.getTodoEndTm());
        assertEquals("User1", todo2.getUserId());

        // 3. 비즈니스 update() 메소드 검증
        todo2.update("NewTitle", "100000", "170000", "NewContent");
        assertEquals("NewTitle", todo2.getTodoTtl());
        assertEquals("100000", todo2.getTodoBgngTm());
        assertEquals("170000", todo2.getTodoEndTm());
        assertEquals("NewContent", todo2.getTodoCn());

        assertNotNull(MemoTodo.builder().toString());
    }
}
