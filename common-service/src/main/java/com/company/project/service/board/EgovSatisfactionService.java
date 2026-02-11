package com.company.project.service.board;

import com.company.project.service.board.dto.SatisfactionDto;
import java.util.List;

public interface EgovSatisfactionService {
    void registerSatisfaction(SatisfactionDto dto);

    void updateSatisfaction(SatisfactionDto dto);

    void deleteSatisfaction(Long satisfactionId);

    List<SatisfactionDto> getSatisfactionList(Long articleId, String boardId);

    SatisfactionDto getSatisfaction(Long satisfactionId);

    boolean checkPassword(Long satisfactionId, String password);

    Double getAverageSatisfaction(Long articleId, String boardId);
}
