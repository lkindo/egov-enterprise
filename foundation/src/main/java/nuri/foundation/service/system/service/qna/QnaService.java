package nuri.foundation.service.system.service.qna;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.system.service.qna.Qna;
import nuri.foundation.domain.system.service.qna.QnaRepository;
import nuri.foundation.service.system.service.qna.dto.QnaDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QnaService implements EgovQnaService {

    private final QnaRepository qnaRepository;

    @Override
    public Page<QnaDto> getQnaList(String keyword, Pageable pageable) {
        return qnaRepository.searchQnas(keyword, Objects.requireNonNull(pageable)).map(QnaDto::from);
    }

    @Override
    public QnaDto getQna(String qaId) {
        return qnaRepository.findById(Objects.requireNonNull(qaId))
                .map(QnaDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createQna(String userId, QnaDto dto) {
        String id = "QNA_" + System.currentTimeMillis();
        Qna entity = Qna.builder()
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
                .qnaProcessSttusCode("Q")
                .writngDe(java.time.LocalDate.now().toString().replace("-", ""))
                .createdBy(userId)
                .build();
        qnaRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateQna(String qaId, String userId, QnaDto dto) {
        Qna entity = qnaRepository.findById(Objects.requireNonNull(qaId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.updateQuestion(dto.getQestnSj(), dto.getQestnCn(), dto.getEmailAdres(),
                dto.getAreaNo(), dto.getMiddleTelno(), dto.getEndTelno());
    }

    @Override
    @Transactional
    public void deleteQna(String qaId, String userId) {
        qnaRepository.deleteById(Objects.requireNonNull(qaId));
    }

    @Override
    @Transactional
    public void updateAnswer(String qaId, String userId, String answerCn) {
        Qna entity = qnaRepository.findById(Objects.requireNonNull(qaId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.answer(answerCn);
    }

    @Override
    @Transactional
    public void increaseViewCount(String qaId) {
        qnaRepository.findById(Objects.requireNonNull(qaId)).ifPresent(Qna::increaseInqireCo);
    }

    @Override
    public boolean checkPassword(String qaId, String password) {
        return qnaRepository.findById(Objects.requireNonNull(qaId))
                .map(e -> e.getWritngPassword() != null && e.getWritngPassword().equals(password))
                .orElse(false);
    }
}
