package com.company.project.service.mail;

import com.company.project.service.mail.dto.SentMailDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 메일 서비스 인터페이스
 */
public interface EgovMailService {

    Page<SentMailDto> getSentMailList(String keyword, Pageable pageable);

    SentMailDto getSentMail(String mssageId);

    String sendMail(String userId, SentMailDto dto);

    void updateMailResult(String mssageId, String resultCode);
}
