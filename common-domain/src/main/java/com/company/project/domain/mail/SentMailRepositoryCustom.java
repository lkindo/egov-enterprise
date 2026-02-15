package com.company.project.domain.mail;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SentMailRepositoryCustom {
    Page<SentMail> searchSentMails(String searchCondition, String searchKeyword, Pageable pageable);
}
