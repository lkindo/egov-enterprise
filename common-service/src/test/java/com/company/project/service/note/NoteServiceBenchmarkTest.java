package com.company.project.service.note;

import com.company.project.TestNoteConfig;
import com.company.project.domain.note.NoteRecptnDomainRepository;
import com.company.project.service.note.dto.NoteDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = { TestNoteConfig.class, NoteService.class })
@ActiveProfiles("test")
public class NoteServiceBenchmarkTest {

    @Autowired
    private NoteService noteService;

    @Autowired
    private NoteRecptnDomainRepository noteRecptnRepository;

    @Test
    @Transactional
    public void measureSendNotePerformance() {
        // Given
        int recipientCount = 1000;
        String noteId = "NOTE_" + System.nanoTime();
        if (noteId.length() > 20)
            noteId = noteId.substring(0, 20);

        String noteTrnsmitId = "TRNS_" + System.nanoTime();
        if (noteTrnsmitId.length() > 20)
            noteTrnsmitId = noteTrnsmitId.substring(0, 20);

        List<NoteDto.NoteRecptnDto> recipients = new ArrayList<>();

        for (int i = 0; i < recipientCount; i++) {
            String noteRecptnId = "RCPT_" + i + "_" + System.nanoTime();
            if (noteRecptnId.length() > 20)
                noteRecptnId = noteRecptnId.substring(0, 20);

            recipients.add(NoteDto.NoteRecptnDto.builder()
                    .noteRecptnId(noteRecptnId)
                    .rcverId("USER_" + i)
                    .recptnSe("1")
                    .build());
        }

        NoteDto dto = NoteDto.builder()
                .noteId(noteId)
                .noteSj("Benchmark Note")
                .noteCn("Benchmark Content")
                .noteTrnsmitId(noteTrnsmitId)
                .trnsmiterId("SENDER_01")
                .frstRegisterId("ADMIN")
                .recipients(recipients)
                .build();

        // When
        long start = System.nanoTime();
        noteService.sendNote(dto);
        long end = System.nanoTime();

        // Then
        long duration = (end - start) / 1_000_000; // ms
        System.out.println("Execution time for " + recipientCount + " recipients: " + duration + " ms");

        assertThat(noteRecptnRepository.count()).isEqualTo(recipientCount);
    }
}
