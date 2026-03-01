package com.company.project.service.mail;

import com.company.project.service.mail.dto.SentMailDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 硫붿????�퉬???명꽣??�씠??
 */
public interface EgovMailService {

    Page<SentMailDto> getSentMailList(String keyword, Pageable pageable);

    Page<SentMailDto> getSentMailList(String searchCondition, String searchKeyword, Pageable pageable);

    SentMailDto getSentMail(String mssageId);

    String sendMail(String userId, SentMailDto dto);

    void updateMailResult(String mssageId, String resultCode);

    void deleteMail(String mssageId);
}
