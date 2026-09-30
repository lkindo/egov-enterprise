package nuri.business.domain.mail;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SentMailRepositoryCustom {

    /**
     * 발송메일 검색.
     *
     * @param senderLoginId 발신자(등록자) loginId. {@code null}/공백이면 전건(관리자 전용 스코프)
     * @param resultCode 발송 결과({@code P}·{@code S}·{@code F}). {@code null} 이면 모든 결과다(2026-10-01 "실패만 보기").
     */
    Page<SentMail> searchSentMails(String senderLoginId, String searchCondition, String searchKeyword,
            String resultCode, Pageable pageable);

    default Page<SentMail> searchSentMails(String senderLoginId, String searchCondition, String searchKeyword,
            Pageable pageable) {
        return searchSentMails(senderLoginId, searchCondition, searchKeyword, null, pageable);
    }
}
