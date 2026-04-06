package nuri.foundation.service.system.service.qna;

import nuri.foundation.service.system.service.qna.dto.QnaDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Q&A ??퉬???명꽣??씠??
 */
public interface EgovQnaService {

    Page<QnaDto> getQnaList(String keyword, Pageable pageable);

    QnaDto getQna(String qaId);

    String createQna(String userId, QnaDto dto);

    void updateQna(String qaId, String userId, QnaDto dto);

    void deleteQna(String qaId, String userId);

    void updateAnswer(String qaId, String userId, String answerCn);

    void increaseViewCount(String qaId);

    boolean checkPassword(String qaId, String password);
}
