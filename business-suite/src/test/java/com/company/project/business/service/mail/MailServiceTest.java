package com.company.project.business.service.mail;

import com.company.project.business.domain.mail.SentMail;
import com.company.project.business.domain.mail.SentMailRepository;
import com.company.project.business.service.mail.dto.SentMailDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("MailService 테스트")
class MailServiceTest {

    @Mock
    private SentMailRepository sentMailRepository;

    @Mock
    private MailAsyncProcessor mailAsyncProcessor;

    @InjectMocks
    private MailService mailService;

    @Test
    @DisplayName("보낸 메일 목록 조회 성공 - 검색어 없음")
    void getSentMailList_NoKeyword_Success() {
        // Given
        PageRequest pageable = PageRequest.of(0, 10);
        SentMail entity = SentMail.builder().mssageId("M1").sj("Subject").build();
        given(sentMailRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(entity)));

        // When
        Page<SentMailDto> result = mailService.getSentMailList(null, pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSj()).isEqualTo("Subject");
    }

    @Test
    @DisplayName("보낸 메일 목록 조회 성공 - 검색어 포함")
    void getSentMailList_WithKeyword_Success() {
        // Given
        PageRequest pageable = PageRequest.of(0, 10);
        SentMail entity = SentMail.builder().mssageId("M1").sj("Subject").build();
        given(sentMailRepository.findBySjContaining("Sub", pageable)).willReturn(new PageImpl<>(List.of(entity)));

        // When
        Page<SentMailDto> result = mailService.getSentMailList("Sub", pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("메일 상세 조회 성공")
    void getSentMail_Success() {
        // Given
        SentMail entity = SentMail.builder().mssageId("M1").sj("Subject").build();
        given(sentMailRepository.findById("M1")).willReturn(Optional.of(entity));

        // When
        SentMailDto result = mailService.getSentMail("M1");

        // Then
        assertThat(result.getMssageId()).isEqualTo("M1");
    }

    @Test
    @DisplayName("메일 전송 성공")
    void sendMail_Success() throws Exception {
        // Given
        SentMailDto dto = SentMailDto.builder()
                .sj("Test Mail")
                .emailCn("Content")
                .dsptchPerson("sender@test.com")
                .recptnPerson("receiver@test.com")
                .build();

        // When
        String mssageId = mailService.sendMail("user1", dto);

        // Then
        assertThat(mssageId).startsWith("MAIL_");
        verify(sentMailRepository).save(any(SentMail.class));
        verify(mailAsyncProcessor).processSending(eq(mssageId), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("메일 결과 업데이트 성공")
    void updateMailResult_Success() {
        // Given
        SentMail entity = SentMail.builder().mssageId("M1").build();
        given(sentMailRepository.findById("M1")).willReturn(Optional.of(entity));

        // When
        mailService.updateMailResult("M1", "S");

        // Then
        assertThat(entity.getSndngResultCode()).isEqualTo("S");
    }

    @Test
    @DisplayName("메일 삭제 성공")
    void deleteMail_Success() {
        // Given
        SentMail entity = SentMail.builder().mssageId("M1").build();
        given(sentMailRepository.findById("M1")).willReturn(Optional.of(entity));

        // When
        mailService.deleteMail("M1");

        // Then
        verify(sentMailRepository).delete(entity);
    }
}
