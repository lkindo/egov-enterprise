package nuri.business.service.faq;

import nuri.business.service.faq.dto.FaqDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * FAQ 서비스 인터페이스
 */
public interface EgovFaqService {

    /**
     * FAQ 목록 조회
     */
    Page<FaqDto> getFaqList(String keyword, Pageable pageable);

    /**
     * FAQ 상세 조회
     */
    FaqDto getFaq(String faqId);

    /**
     * FAQ 등록
     */
    String createFaq(String userId, FaqDto dto);

    /**
     * FAQ 수정
     */
    void updateFaq(String faqId, String userId, FaqDto dto);

    /**
     * FAQ 삭제
     */
    void deleteFaq(String faqId, String userId);

    /**
     * 조회수 증가
     */
    void increaseViewCount(String faqId);
}
