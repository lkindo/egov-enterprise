package com.company.project.service.qna;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.qna.Qna;
import com.company.project.domain.qna.QnaRepository;
import com.company.project.service.qna.dto.QnaDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QnaService implements EgovQnaService {

    private final QnaRepository qnaRepository;

    @Override
    public Page<QnaDto> getQnaList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return qnaRepository.findAll(pageable).map(QnaDto::from);
        }
        return qnaRepository.findByQestnSjContaining(keyword, pageable).map(QnaDto::from);
    }

    @Override
    @Transactional
    public QnaDto getQna(String qaId) {
        Qna entity = qnaRepository.findById(qaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.increaseInqireCo();
        return QnaDto.from(entity);
    }

    @Override
    @Transactional
    public void insertQna(String userId, QnaDto dto) {
        String id = "QA_" + String.format("%013d", System.currentTimeMillis());
        qnaRepository.save(Qna.builder()
                .qaId(id)
                .qestnSj(dto.getQestnSj())
                .qestnCn(dto.getQestnCn())
                .writngPassword(dto.getWritngPassword())
                .wrterNm(dto.getWrterNm())
                .emailAdres(dto.getEmailAdres())
                .emailAnswerAt(dto.getEmailAnswerAt())
                .areaNo(dto.getAreaNo())
                .middleTelno(dto.getMiddleTelno())
                .endTelno(dto.getEndTelno())
                .build());
    }

    @Override
    @Transactional
    public void updateQna(String qaId, String userId, QnaDto dto) {
        Qna entity = qnaRepository.findById(qaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.updateQuestion(dto.getQestnSj(), dto.getQestnCn(), dto.getEmailAdres(),
                dto.getAreaNo(), dto.getMiddleTelno(), dto.getEndTelno());
    }

    @Override
    @Transactional
    public void deleteQna(String qaId) {
        qnaRepository.deleteById(qaId);
    }

    @Override
    @Transactional
    public void answerQna(String qaId, String userId, String answerCn) {
        Qna entity = qnaRepository.findById(qaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.answer(answerCn);
    }
}
