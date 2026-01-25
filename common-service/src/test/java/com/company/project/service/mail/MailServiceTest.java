package com.company.project.service.mail;

import com.company.project.domain.mail.SentMail;
import com.company.project.domain.mail.SentMailRepository;
import com.company.project.service.mail.dto.SentMailDto;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MailServiceTest {

    @Mock
    private SentMailRepository sentMailRepository;

    @Mock
    private JavaMailSender javaMailSender;

    @Mock
    private MimeMessage mimeMessage;

    @InjectMocks
    private MailService mailService;

    @Test
    @DisplayName("Send mail success")
    void sendMail_Success() {
        // Given
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject")
                .emailCn("Content")
                .dsptchPerson("sender@example.com")
                .recptnPerson("receiver@example.com")
                .build();

        given(javaMailSender.createMimeMessage()).willReturn(mimeMessage);

        // Use an ArgumentCaptor to verify the entity state if needed,
        // but for now, we verify that save is called and send is called.
        // To verify the final status, we can capture the argument passed to save,
        // but the update happens AFTER save.
        // So the captured object will be the one referenced.

        // When
        String messageId = mailService.sendMail("user1", dto);

        // Then
        verify(sentMailRepository).save(argThat(sentMail -> {
            // Check initial state or final state?
            // save is called before updateResult.
            // But since it's the same object reference, if we inspect it NOW (after method return),
            // it should have the updated status "S".
            return sentMail.getSndngResultCode().equals("S");
        }));
        verify(javaMailSender).send(mimeMessage);
    }

    @Test
    @DisplayName("Send mail failure")
    void sendMail_Failure() {
        // Given
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject")
                .emailCn("Content")
                .dsptchPerson("sender@example.com")
                .recptnPerson("receiver@example.com")
                .build();

        given(javaMailSender.createMimeMessage()).willReturn(mimeMessage);
        doThrow(new RuntimeException("Mail Error")).when(javaMailSender).send(mimeMessage);

        // When
        mailService.sendMail("user1", dto);

        // Then
        verify(sentMailRepository).save(argThat(sentMail -> {
            return sentMail.getSndngResultCode().equals("F");
        }));
        verify(javaMailSender).send(mimeMessage);
    }
}
