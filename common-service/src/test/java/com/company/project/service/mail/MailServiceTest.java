package com.company.project.service.mail;

import com.company.project.domain.mail.SentMailRepository;
import com.company.project.service.mail.dto.SentMailDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MailServiceTest {

    @Mock
    private SentMailRepository sentMailRepository;

    @Mock
    private EmailSender emailSender;

    @InjectMocks
    private MailService mailService;

    @Test
    @DisplayName("Send mail success")
    void sendMail_Success() throws Exception {
        // Given
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject")
                .emailCn("Content")
                .dsptchPerson("sender@example.com")
                .recptnPerson("receiver@example.com")
                .build();

        // When
        mailService.sendMail("user1", dto);

        // Then
        // Verify that save was called. The object passed to save is mutated later,
        // so we check its final state or we rely on the fact that updateResult was
        // called (which we can't verify directly on entity).
        // But we can verify the state of the captured argument.
        verify(sentMailRepository).save(java.util.Objects.requireNonNull(argThat(sentMail -> {
            return sentMail != null && sentMail.getSndngResultCode().equals("S");
        })));
        verify(emailSender).send(eq("Subject"), eq("Content"), eq("sender@example.com"), eq("receiver@example.com"));
    }

    @Test
    @DisplayName("Send mail failure")
    void sendMail_Failure() throws Exception {
        // Given
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject")
                .emailCn("Content")
                .dsptchPerson("sender@example.com")
                .recptnPerson("receiver@example.com")
                .build();

        doThrow(new RuntimeException("Mail Error")).when(emailSender).send(anyString(), anyString(), anyString(),
                anyString());

        // When
        mailService.sendMail("user1", dto);

        // Then
        verify(sentMailRepository).save(java.util.Objects.requireNonNull(argThat(sentMail -> {
            return sentMail != null && sentMail.getSndngResultCode().equals("F");
        })));
        verify(emailSender).send(eq("Subject"), eq("Content"), eq("sender@example.com"), eq("receiver@example.com"));
    }
}
