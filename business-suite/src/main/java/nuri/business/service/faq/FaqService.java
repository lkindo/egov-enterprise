package nuri.business.service.faq;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.faq.Faq;
import nuri.business.domain.faq.FaqRepository;
import nuri.business.service.faq.dto.FaqDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

/**
 * FAQ 서비스 구현 클래스
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FaqService implements EgovFaqService {

    private final FaqRepository faqRepository;

    @Override
    public Page<FaqDto> getFaqList(String keyword, Pageable pageable) {
        return faqRepository.searchFaqs(keyword, Objects.requireNonNull(pageable)).map(FaqDto::from);
    }

    @Override
    public FaqDto getFaq(String faqId) {
        return faqRepository.findById(Objects.requireNonNull(faqId))
                .map(FaqDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createFaq(String userId, FaqDto dto) {
        // 불필요한 패딩 제거 및 가독성 개선
        String id = "FAQ_" + System.currentTimeMillis();
        Faq entity = Faq.builder()
                .faqId(id)
                .qestnSj(dto.getQestnSj())
                .qestnCn(dto.getQestnCn())
                .answerCn(dto.getAnswerCn())
                .atchFileId(dto.getAtchFileId())
                .build();
        faqRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateFaq(String faqId, String userId, FaqDto dto) {
        Faq entity = faqRepository.findById(Objects.requireNonNull(faqId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getQestnSj(), dto.getQestnCn(), dto.getAnswerCn(), dto.getAtchFileId());
    }

    @Override
    @Transactional
    public void deleteFaq(String faqId, String userId) {
        faqRepository.deleteById(Objects.requireNonNull(faqId));
    }

    @Override
    @Transactional
    public void increaseViewCount(String faqId) {
        faqRepository.findById(Objects.requireNonNull(faqId)).ifPresent(Faq::increaseViewCount);
    }
}
