package com.company.project.service.board;

import com.company.project.service.board.dto.SatisfactionDto;
import java.util.List;

public interface EgovSatisfactionService {
    void registerSatisfaction(SatisfactionDto dto);

    void updateSatisfaction(SatisfactionDto dto);

    void deleteSatisfaction(String satisfactionId);

    List<SatisfactionDto> getSatisfactionList(Long articleId, String boardId);

    SatisfactionDto getSatisfaction(String satisfactionId);

    boolean checkPassword(String satisfactionId, String password);

    Double getAverageSatisfaction(Long articleId, String boardId);
}
