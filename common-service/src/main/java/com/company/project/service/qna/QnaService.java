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

/**
 * Q&A 서비스 구현체
 */
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
        return qnaRepository.searchByKeyword(keyword, pageable).map(QnaDto::from);
    }

    @Override
    public QnaDto getQna(String qaId) {
        Qna qna = qnaRepository.findById(qaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return QnaDto.from(qna);
    }

    @Override
    @Transactional
    public String createQna(String userId, QnaDto dto) {
        String qaId = "QNA_" + String.format("%013d", System.currentTimeMillis());

        Qna qna = Qna.builder()
                .qaId(qaId)
                .qestnSj(dto.getQestnSj())
                .qestnCn(dto.getQestnCn())
                .writngPassword(dto.getWritngPassword())
                .wrterNm(dto.getWrterNm())
                .emailAdres(dto.getEmailAdres())
                .emailAnswerAt(dto.getEmailAnswerAt())
                .areaNo(dto.getAreaNo())
                .middleTelno(dto.getMiddleTelno())
                .endTelno(dto.getEndTelno())
                .frstRegisterId(userId)
                .build();

        qnaRepository.save(qna);
        return qaId;
    }

    @Override
    @Transactional
    public void updateQna(String qaId, String userId, QnaDto dto) {
        Qna qna = qnaRepository.findById(qaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        qna.updateQuestion(dto.getQestnSj(), dto.getQestnCn(), dto.getEmailAdres(),
                dto.getAreaNo(), dto.getMiddleTelno(), dto.getEndTelno(), userId);
    }

    @Override
    @Transactional
    public void deleteQna(String qaId, String userId) {
        Qna qna = qnaRepository.findById(qaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        qnaRepository.delete(qna);
    }

    @Override
    @Transactional
    public void updateAnswer(String qaId, String userId, String answerCn) {
        Qna qna = qnaRepository.findById(qaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        qna.updateAnswer(answerCn, userId);
    }

    @Override
    @Transactional
    public void increaseViewCount(String qaId) {
        Qna qna = qnaRepository.findById(qaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        qna.increaseViewCount();
    }

    @Override
    public boolean checkPassword(String qaId, String password) {
        Qna qna = qnaRepository.findById(qaId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return qna.checkPassword(password);
    }
}
