package com.company.project.domain.mail;

import com.company.project.domain.mail.SentMail;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SentMailRepositoryCustom {
    Page<SentMail> searchSentMails(String searchCondition, String searchKeyword, Pageable pageable);
}
