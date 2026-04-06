package nuri.business.service.board;

import nuri.business.service.board.dto.SatisfactionDto;
import java.util.List;

public interface EgovSatisfactionService {
    void registerSatisfaction(SatisfactionDto dto);

    void updateSatisfaction(SatisfactionDto dto);

    void deleteSatisfaction(@org.springframework.lang.NonNull Long satisfactionId);

    List<SatisfactionDto> getSatisfactionList(Long articleId, String boardId);

    SatisfactionDto getSatisfaction(@org.springframework.lang.NonNull Long satisfactionId);

    boolean checkPassword(@org.springframework.lang.NonNull Long satisfactionId, String password);

    Double getAverageSatisfaction(Long articleId, String boardId);
}
