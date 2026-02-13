package egovframework.com.uss.ion.ntr.service.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.company.project.domain.note.NoteRecptnDomainRepository;
import com.company.project.domain.note.NoteTrnsmitDomainRepository;
import com.company.project.domain.note.NoteDomainRepository;
import com.company.project.domain.user.UserRepository;
import com.company.project.domain.note.NoteRecptn;
import com.company.project.domain.note.Note;
import com.company.project.domain.note.NoteTrnsmit;
import com.company.project.service.note.NoteService;
import com.company.project.service.note.dto.NoteRecptnDto;

import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

@ExtendWith(MockitoExtension.class)
public class EgovNoteRecptnServiceTest {

    @Mock
    private NoteDomainRepository noteRepository;
    @Mock
    private NoteTrnsmitDomainRepository noteTrnsmitRepository;
    @Mock
    private NoteRecptnDomainRepository noteRecptnRepository;
    @Mock
    private UserRepository userRepository;

    @Mock
    private EgovIdGnrService egovNoteIdGnrService;
    @Mock
    private EgovIdGnrService egovNoteTrnsmitIdGnrService;
    @Mock
    private EgovIdGnrService egovNoteRecptnIdGnrService;

    @InjectMocks
    private NoteService service;

    @Test
    public void getReceivedNotes_ShouldReturnPageOfDtos() throws Exception {
        // Arrange
        String userId = "USER_001";
        Pageable pageable = PageRequest.of(0, 10);

        NoteRecptn entity = NoteRecptn.builder()
                .noteRecptnId("NOTE_RECPTN_001")
                .note(Note.builder().noteId("NOTE_001").noteSj("Test Subject").build())
                .noteTrnsmit(NoteTrnsmit.builder().noteTrnsmitId("NOTE_TRNS_001").trnsmiterId("SENDER_001").build())
                .rcverId(userId)
                .openYn("Y")
                .recptnSe("1")
                .build();

        Page<NoteRecptn> page = new PageImpl<>(Collections.singletonList(entity));

        when(noteRecptnRepository.findByRcverId(eq(userId), any(Pageable.class))).thenReturn(page);

        // Act
        Page<NoteRecptnDto> result = service.getReceivedNotes(userId, pageable);

        // Assert
        assertEquals(1, result.getContent().size());
        assertEquals("NOTE_RECPTN_001", result.getContent().get(0).getNoteRecptnId());
        assertEquals("Test Subject", result.getContent().get(0).getNoteSj());

        verify(noteRecptnRepository).findByRcverId(eq(userId), any(Pageable.class));
    }
}
