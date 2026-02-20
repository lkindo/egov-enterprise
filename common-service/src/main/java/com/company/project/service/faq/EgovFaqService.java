package com.company.project.service.faq;

import com.company.project.service.faq.dto.FaqDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * FAQ ?쒕퉬???명꽣?섏씠??
 */
public interface EgovFaqService {

    /**
     * FAQ 紐⑸줉 議고쉶
     */
    Page<FaqDto> getFaqList(String keyword, Pageable pageable);

    /**
     * FAQ ?곸꽭 議고쉶
     */
    FaqDto getFaq(String faqId);

    /**
     * FAQ ?깅줉
     */
    String createFaq(String userId, FaqDto dto);

    /**
     * FAQ ?섏젙
     */
    void updateFaq(String faqId, String userId, FaqDto dto);

    /**
     * FAQ ??젣
     */
    void deleteFaq(String faqId, String userId);

    /**
     * 議고쉶??利앷?
     */
    void increaseViewCount(String faqId);
}
