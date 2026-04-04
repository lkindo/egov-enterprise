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
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("MailService 단위 테스트")
class MailServiceTest {

    @InjectMocks
    private MailService mailService;

    @Mock
    private SentMailRepository sentMailRepository;

    @Mock
    private MailAsyncProcessor mailAsyncProcessor;

    @Test
    @DisplayName("보낸 메일 목록 조회 - 키워드 없음")
    void getSentMailList_NoKeyword() {
        Pageable pageable = PageRequest.of(0, 10);
        SentMail mail = SentMail.builder().mssageId("M1").sj("Subject").build();
        given(sentMailRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(mail)));

        Page<SentMailDto> result = mailService.getSentMailList(null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getMssageId()).isEqualTo("M1");
    }

    @Test
    @DisplayName("보낸 메일 상세 조회 - 성공")
    void getSentMail_Success() {
        SentMail mail = SentMail.builder().mssageId("M1").sj("Subject").build();
        given(sentMailRepository.findById("M1")).willReturn(Optional.of(mail));

        SentMailDto result = mailService.getSentMail("M1");

        assertThat(result.getMssageId()).isEqualTo("M1");
    }

    @Test
    @DisplayName("메일 발송 - 성공")
    void sendMail_Success() {
        SentMailDto dto = SentMailDto.builder()
                .sj("Subject")
                .emailCn("Content")
                .dsptchPerson("sender@test.com")
                .recptnPerson("receiver@test.com")
                .build();

        String mssageId = mailService.sendMail("user1", dto);

        assertThat(mssageId).startsWith("MAIL_");
        verify(sentMailRepository).save(any(SentMail.class));
        verify(mailAsyncProcessor).processSending(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("메일 결과 업데이트")
    void updateMailResult() {
        SentMail mail = SentMail.builder().mssageId("M1").sndngResultCode("P").build();
        given(sentMailRepository.findById("M1")).willReturn(Optional.of(mail));

        mailService.updateMailResult("M1", "S");

        assertThat(mail.getSndngResultCode()).isEqualTo("S");
    }

    @Test
    @DisplayName("메일 삭제")
    void deleteMail() {
        SentMail mail = SentMail.builder().mssageId("M1").build();
        given(sentMailRepository.findById("M1")).willReturn(Optional.of(mail));

        mailService.deleteMail("M1");

        verify(sentMailRepository).delete(mail);
    }
}
