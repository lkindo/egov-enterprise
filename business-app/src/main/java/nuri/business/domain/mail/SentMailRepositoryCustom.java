package nuri.business.domain.mail;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SentMailRepositoryCustom {

    /**
     * 발송메일 검색.
     *
     * @param senderLoginId 발신자(등록자) loginId. {@code null}/공백이면 전건(관리자 전용 스코프)
     */
    Page<SentMail> searchSentMails(String senderLoginId, String searchCondition, String searchKeyword,
            Pageable pageable);
}
