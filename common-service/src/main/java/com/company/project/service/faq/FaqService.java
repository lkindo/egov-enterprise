package com.company.project.service.faq;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.faq.Faq;
import com.company.project.domain.faq.FaqRepository;
import com.company.project.service.faq.dto.FaqDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

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
        String id = "FAQ_" + String.format("%016d", System.currentTimeMillis());
        Faq entity = Faq.builder()
                .faqId(id)
                .qestnSj(dto.getQestnSj())
                .qestnCn(dto.getQestnCn())
                .answerCn(dto.getAnswerCn())
                .atchFileId(dto.getAtchFileId())
                .frstRegisterId(userId)
                .build();
        faqRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateFaq(String faqId, String userId, FaqDto dto) {
        Faq entity = faqRepository.findById(Objects.requireNonNull(faqId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getQestnSj(), dto.getQestnCn(), dto.getAnswerCn(), dto.getAtchFileId(), userId);
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