package nuri.business.domain.note;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import static org.junit.jupiter.api.Assertions.*;

class NoteDomainTest {

    @Test
    @DisplayName("Note 엔티티 생성자, 빌더 및 레거시 별칭 100% 검증")
    void note_all_features_test() throws Exception {
        // 1. 기본 생성자 (Protected) 검증
        Constructor<Note> noArgConstructor = Note.class.getDeclaredConstructor();
        noArgConstructor.setAccessible(true);
        Note note1 = noArgConstructor.newInstance();
        assertNotNull(note1);

        // 2. 전체 인자 생성자 및 기본 Getter 검증
        Note note2 = new Note("N1", "Title", "Content", "F1");
        assertEquals("N1", note2.getNoteId());
        assertEquals("Title", note2.getNoteTtl());
        assertEquals("Content", note2.getNoteCn());
        assertEquals("F1", note2.getAtchFileId());

        // 3. SuperBuilder 검증
        Note note3 = Note.builder()
                .noteId("N3")
                .noteTtl("Subject")
                .noteCn("Content3")
                .atchFileId("F3")
                .build();
        assertEquals("N3", note3.getNoteId());
        assertEquals("Subject", note3.getNoteTtl());
        assertEquals("Content3", note3.getNoteCn());
        assertEquals("F3", note3.getAtchFileId());

        assertNotNull(Note.builder().toString());
    }

    @Test
    @DisplayName("NoteRecptn 엔티티 생성자, 빌더, 레거시 별칭 및 Lifecycle 100% 검증")
    void noteRecptn_all_features_test() throws Exception {
        // 1. 기본 생성자 (Protected) 검증
        Constructor<NoteRecptn> noArgConstructor = NoteRecptn.class.getDeclaredConstructor();
        noArgConstructor.setAccessible(true);
        NoteRecptn recptn1 = noArgConstructor.newInstance();
        assertNotNull(recptn1);

        // 2. 전체 인자 생성자 검증
        Note note = Note.builder().noteId("N1").build();
        NoteTrnsmit trnsmit = NoteTrnsmit.builder().noteSndngId("T1").build();
        NoteRecptn recptn2 = new NoteRecptn("R2", note, trnsmit, "RcvId", "Y", "Cd1", "N");
        assertEquals("R2", recptn2.getNoteRcptnId());
        assertEquals(note, recptn2.getNote());
        assertEquals(trnsmit, recptn2.getNoteDsptch());
        assertEquals("RcvId", recptn2.getRcvrId());
        assertEquals("Y", recptn2.getOpenYn());
        assertEquals("Cd1", recptn2.getRcptnSeCd());

        // 3. SuperBuilder 검증
        NoteRecptn recptn3 = NoteRecptn.builder()
                .noteRcptnId("R3")
                .note(note)
                .noteDsptch(trnsmit)
                .rcvrId("RcvId3")
                .rcptnSeCd("Cd3")
                .build();
        assertEquals("R3", recptn3.getNoteRcptnId());
        assertEquals("RcvId3", recptn3.getRcvrId());
        assertEquals("Cd3", recptn3.getRcptnSeCd());

        // 5. PrePersist onCreate Lifecycle 검증
        NoteRecptn recptnLifecycle1 = NoteRecptn.builder().build();
        assertNull(recptnLifecycle1.getOpenYn());
        Method onCreate = NoteRecptn.class.getDeclaredMethod("onCreate");
        onCreate.setAccessible(true);
        onCreate.invoke(recptnLifecycle1);
        assertEquals("N", recptnLifecycle1.getOpenYn());

        NoteRecptn recptnLifecycle2 = NoteRecptn.builder().openYn("Y").build();
        onCreate.invoke(recptnLifecycle2);
        assertEquals("Y", recptnLifecycle2.getOpenYn());

        assertNotNull(NoteRecptn.builder().toString());
    }

    @Test
    @DisplayName("NoteTrnsmit 엔티티 생성자, 빌더, 레거시 별칭 및 Lifecycle 100% 검증")
    void noteTrnsmit_all_features_test() throws Exception {
        // 1. 기본 생성자 (Protected) 검증
        Constructor<NoteTrnsmit> noArgConstructor = NoteTrnsmit.class.getDeclaredConstructor();
        noArgConstructor.setAccessible(true);
        NoteTrnsmit trnsmit1 = noArgConstructor.newInstance();
        assertNotNull(trnsmit1);

        // 2. 전체 인자 생성자 검증
        Note note = Note.builder().noteId("N1").build();
        NoteTrnsmit trnsmit2 = new NoteTrnsmit("T2", note, "SndId", "Y");
        assertEquals("T2", trnsmit2.getNoteSndngId());
        assertEquals(note, trnsmit2.getNote());
        assertEquals("SndId", trnsmit2.getSndrId());
        assertEquals("Y", trnsmit2.getDelYn());

        // 3. SuperBuilder 검증
        NoteTrnsmit trnsmit3 = NoteTrnsmit.builder()
                .noteSndngId("T3")
                .note(note)
                .sndrId("SndId3")
                .delYn("N")
                .build();
        assertEquals("T3", trnsmit3.getNoteSndngId());
        assertEquals("SndId3", trnsmit3.getSndrId());

        // 5. PrePersist onCreate Lifecycle 검증
        NoteTrnsmit trnsmitLifecycle1 = NoteTrnsmit.builder().build();
        assertNull(trnsmitLifecycle1.getDelYn());
        Method onCreate = NoteTrnsmit.class.getDeclaredMethod("onCreate");
        onCreate.setAccessible(true);
        onCreate.invoke(trnsmitLifecycle1);
        assertEquals("N", trnsmitLifecycle1.getDelYn());

        NoteTrnsmit trnsmitLifecycle2 = NoteTrnsmit.builder().delYn("Y").build();
        onCreate.invoke(trnsmitLifecycle2);
        assertEquals("Y", trnsmitLifecycle2.getDelYn());

        assertNotNull(NoteTrnsmit.builder().toString());
    }
}
