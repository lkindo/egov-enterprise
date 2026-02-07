package egovframework.com.uss.ion.ntr.service.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Collections;
import java.util.List;

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
import com.company.project.domain.note.NoteRecptn;
import com.company.project.domain.note.Note;
import com.company.project.domain.note.NoteTrnsmit;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

@ExtendWith(MockitoExtension.class)
public class EgovNoteRecptnServiceTest {

    @Mock
    private NoteRecptnDomainRepository noteRecptnRepository;

    @InjectMocks
    private EgovNoteRecptnServiceImpl service;

    @Test
    public void selectNoteRecptnList_ShouldUsePagination() throws Exception {
        // Arrange
        egovframework.com.uss.ion.ntr.service.NoteRecptn searchVO = new egovframework.com.uss.ion.ntr.service.NoteRecptn();
        searchVO.setPageIndex(1);
        searchVO.setPageUnit(10);

        NoteRecptn entity = NoteRecptn.builder()
                .noteRecptnId("NOTE_RECPTN_001")
                .note(Note.builder().noteId("NOTE_001").build())
                .noteTrnsmit(NoteTrnsmit.builder().noteTrnsmitId("NOTE_TRNS_001").build())
                .rcverId("USER_001")
                .openYn("Y")
                .build();

        Page<NoteRecptn> page = new PageImpl<>(Collections.singletonList(entity));

        // Mocking findAll(Pageable) - This is what we WANT
        when(noteRecptnRepository.findAll(any(Pageable.class))).thenReturn(page);

        // Act
        List<EgovMap> result = service.selectNoteRecptnList(searchVO);

        // Assert
        assertEquals(1, result.size());
        assertEquals("NOTE_RECPTN_001", result.get(0).get("noteRecptnId"));

        verify(noteRecptnRepository).findAll(any(Pageable.class));
    }
}
