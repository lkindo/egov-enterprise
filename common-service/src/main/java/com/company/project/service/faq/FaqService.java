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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FaqService implements EgovFaqService {

    private final FaqRepository faqRepository;

    @Override
    public Page<FaqDto> getFaqList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return faqRepository.findAll(pageable).map(FaqDto::from);
        }
        return faqRepository.findByQestnSjContaining(keyword, pageable).map(FaqDto::from);
    }

    @Override
    @Transactional
    public FaqDto getFaq(String faqId) {
        Faq entity = faqRepository.findById(faqId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.increaseInqireCo();
        return FaqDto.from(entity);
    }

    @Override
    @Transactional
    public void insertFaq(String userId, FaqDto dto) {
        String id = "FAQ_" + String.format("%013d", System.currentTimeMillis());
        faqRepository.save(Faq.builder()
                .faqId(id)
                .qestnSj(dto.getQestnSj())
                .qestnCn(dto.getQestnCn())
                .answerCn(dto.getAnswerCn())
                .atchFileId(dto.getAtchFileId())
                .build());
    }

    @Override
    @Transactional
    public void updateFaq(String faqId, String userId, FaqDto dto) {
        Faq entity = faqRepository.findById(faqId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getQestnSj(), dto.getQestnCn(), dto.getAnswerCn(), dto.getAtchFileId());
    }

    @Override
    @Transactional
    public void deleteFaq(String faqId) {
        faqRepository.deleteById(faqId);
    }
}
