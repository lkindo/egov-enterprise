package com.company.project.business.domain.note;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.lang.reflect.Method;
import static org.junit.jupiter.api.Assertions.*;

class NoteDomainTest {

    @Test
    @DisplayName("Note 엔티티 생성 및 빌더 테스트")
    void note_builder_test() {
        Note note = Note.builder()
                .noteId("N1")
                .noteSj("Subject")
                .noteCn("Content")
                .atchFileId("F1")
                .build();
        
        assertEquals("N1", note.getNoteId());
        assertEquals("Subject", note.getNoteSj());
    }

    @Test
    @DisplayName("NoteRecptn 생명주기(onCreate) 테스트")
    void noteRecptn_lifecycle_test() throws Exception {
        NoteRecptn recptn = NoteRecptn.builder()
                .noteRecptnId("R1")
                .build();
        
        assertNull(recptn.getOpenYn());

        // Invoke @PrePersist method via reflection
        Method onCreate = NoteRecptn.class.getDeclaredMethod("onCreate");
        onCreate.setAccessible(true);
        onCreate.invoke(recptn);

        assertEquals("N", recptn.getOpenYn());
        
        // Re-call should not change already set value
        recptn = NoteRecptn.builder().openYn("Y").build();
        onCreate.invoke(recptn);
        assertEquals("Y", recptn.getOpenYn());
    }

    @Test
    @DisplayName("NoteTrnsmit 생명주기(onCreate) 테스트")
    void noteTrnsmit_lifecycle_test() throws Exception {
        NoteTrnsmit trnsmit = NoteTrnsmit.builder()
                .noteTrnsmitId("T1")
                .build();
        
        assertNull(trnsmit.getDeleteAt());

        // Invoke @PrePersist method
        Method onCreate = NoteTrnsmit.class.getDeclaredMethod("onCreate");
        onCreate.setAccessible(true);
        onCreate.invoke(trnsmit);

        assertEquals("N", trnsmit.getDeleteAt());
        
        // Value present
        trnsmit = NoteTrnsmit.builder().deleteAt("Y").build();
        onCreate.invoke(trnsmit);
        assertEquals("Y", trnsmit.getDeleteAt());
    }
}
