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

/**
 * FAQ 서비스 구현체
 */
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
        return faqRepository.searchByKeyword(keyword, pageable).map(FaqDto::from);
    }

    @Override
    public FaqDto getFaq(String faqId) {
        Faq faq = faqRepository.findById(faqId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return FaqDto.from(faq);
    }

    @Override
    @Transactional
    public String createFaq(String userId, FaqDto dto) {
        // ID 생성: FAQ_ + timestamp
        String faqId = "FAQ_" + String.format("%013d", System.currentTimeMillis());

        Faq faq = Faq.builder()
                .faqId(faqId)
                .qestnSj(dto.getQestnSj())
                .qestnCn(dto.getQestnCn())
                .answerCn(dto.getAnswerCn())
                .atchFileId(dto.getAtchFileId())
                .frstRegisterId(userId)
                .build();

        faqRepository.save(faq);
        return faqId;
    }

    @Override
    @Transactional
    public void updateFaq(String faqId, String userId, FaqDto dto) {
        Faq faq = faqRepository.findById(faqId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        faq.update(dto.getQestnSj(), dto.getQestnCn(), dto.getAnswerCn(),
                dto.getAtchFileId(), userId);
    }

    @Override
    @Transactional
    public void deleteFaq(String faqId, String userId) {
        Faq faq = faqRepository.findById(faqId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        faqRepository.delete(faq);
    }

    @Override
    @Transactional
    public void increaseViewCount(String faqId) {
        Faq faq = faqRepository.findById(faqId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        faq.increaseViewCount();
    }
}
