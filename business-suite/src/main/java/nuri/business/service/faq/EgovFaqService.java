package nuri.business.service.faq;

import nuri.business.service.faq.dto.FaqDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * FAQ ??퉬???명꽣??씠??
 */
public interface EgovFaqService {

    /**
     * FAQ 명⑸議고??     */
    Page<FaqDto> getFaqList(String keyword, Pageable pageable);

    /**
     * FAQ ?곸꽭 議고??     */
    FaqDto getFaq(String faqId);

    /**
     * FAQ ?깅줉
     */
    String createFaq(String userId, FaqDto dto);

    /**
     * FAQ ??젙
     */
    void updateFaq(String faqId, String userId, FaqDto dto);

    /**
     * FAQ ????     */
    void deleteFaq(String faqId, String userId);

    /**
     * 議고利앷?
     */
    void increaseViewCount(String faqId);
}
