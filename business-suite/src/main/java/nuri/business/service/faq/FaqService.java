package nuri.business.service.faq;

import nuri.business.domain.faq.Faq;
import nuri.business.domain.faq.FaqRepository;
import nuri.business.service.faq.dto.FaqDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FaqService extends BaseAbstractService {

    private final FaqRepository faqRepository;

    public Page<FaqDto> getFaqList(String searchWrd, @NonNull Pageable pageable) {
        return faqRepository.searchFaqs(searchWrd, Objects.requireNonNull(pageable))
                .map(FaqDto::from);
    }

    public FaqDto getFaq(@NonNull String faqId) {
        return faqRepository.findById(faqId)
                .map(FaqDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public String createFaq(String userId, FaqDto dto) {
        Faq entity = Faq.builder()
                .faqId(dto.getFaqId())
                .qestnTtl(dto.getQestnTtl())
                .qestnCn(dto.getQestnCn())
                .answerCn(dto.getAnswerCn())
                .atchFileId(dto.getAtchFileId())
                .createdBy(userId)
                .build();
        faqRepository.save(entity);
        return entity.getFaqId();
    }

    @Transactional
    public void updateFaq(String faqId, String userId, FaqDto dto) {
        Faq entity = faqRepository.findById(faqId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getQestnTtl(), dto.getQestnCn(), dto.getAnswerCn(), dto.getAtchFileId());
        entity.setLastModifiedBy(userId);
    }

    @Transactional
    public void deleteFaq(@NonNull String faqId, String userId) {
        faqRepository.deleteById(faqId);
    }

    @Transactional
    public void increaseInqireCo(@NonNull String faqId) {
        faqRepository.findById(faqId).ifPresent(Faq::increaseInqireCo);
    }
}
