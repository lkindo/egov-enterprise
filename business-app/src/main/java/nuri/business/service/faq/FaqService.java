package nuri.business.service.faq;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.faq.Faq;
import nuri.business.domain.faq.FaqRepository;
import nuri.business.service.faq.dto.FaqDto;
import nuri.business.service.faq.dto.FaqMapper;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.core.service.BaseAbstractService;
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
    private final FaqMapper faqMapper;

    public Page<FaqDto> getFaqList(String searchWrd, @NonNull Pageable pageable) {
        return faqRepository.searchFaqs(searchWrd, Objects.requireNonNull(pageable))
                .map(faqMapper::toDto);
    }

    public FaqDto getFaq(@NonNull String faqId) {
        return faqRepository.findById(faqId)
                .map(faqMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public String createFaq(String userId, FaqDto dto) {
        Faq entity = Faq.builder()
                .faqId(dto.getFaqId())
                .qstnTtl(dto.getQstnTtl())
                .qstnCn(dto.getQstnCn())
                .ansCn(dto.getAnsCn())
                .atchFileId(dto.getAtchFileId())
                .build();
        faqRepository.save(entity);
        return entity.getFaqId();
    }

    @Transactional
    public void updateFaq(String faqId, String userId, FaqDto dto) {
        Faq entity = faqRepository.findById(faqId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getQstnTtl(), dto.getQstnCn(), dto.getAnsCn(), dto.getAtchFileId());
        entity.setLastMdfrId(userId);
    }

    @Transactional
    public void deleteFaq(@NonNull String faqId, String userId) {
        faqRepository.deleteById(faqId);
    }

    @Transactional
    public void increaseInqCnt(@NonNull String faqId) {
        faqRepository.findById(faqId).ifPresent(faq -> faq.increaseInqCnt());
    }
}
