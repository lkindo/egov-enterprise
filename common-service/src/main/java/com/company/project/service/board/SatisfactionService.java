package com.company.project.service.board;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.board.Satisfaction;
import com.company.project.domain.board.SatisfactionRepository;
import com.company.project.service.board.dto.SatisfactionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SatisfactionService implements EgovSatisfactionService {

    private final SatisfactionRepository satisfactionRepository;

    @Override
    @Transactional
    public void registerSatisfaction(SatisfactionDto dto) {
        Satisfaction satisfaction = Satisfaction.builder()
                .satisfactionId(dto.getSatisfactionId())
                .articleId(dto.getArticleId())
                .boardId(dto.getBoardId())
                .writerId(dto.getWriterId())
                .writerNm(dto.getWriterNm())
                .satisfactionLevel(dto.getSatisfactionLevel())
                .satisfactionOpinion(dto.getSatisfactionOpinion())
                .password(dto.getSatisfactionPassword()) // Set password
                .useAt("Y")
                .frstRegisterId(dto.getWriterId())
                .lastUpdusrId(dto.getWriterId())
                .build();
        satisfactionRepository.save(satisfaction);
    }

    @Override
    @Transactional
    public void updateSatisfaction(SatisfactionDto dto) {
        satisfactionRepository.findById(dto.getSatisfactionId())
                .ifPresent(s -> s.update(dto.getSatisfactionLevel(), dto.getSatisfactionOpinion(), dto.getWriterId(),
                        dto.getSatisfactionPassword()));
    }

    @Override
    @Transactional
    public void deleteSatisfaction(String satisfactionId) {
        satisfactionRepository.deleteById(satisfactionId);
    }

    @Override
    public List<SatisfactionDto> getSatisfactionList(Long articleId, String boardId) {
        return satisfactionRepository.findByArticleIdAndBoardId(articleId, boardId).stream()
                .map(s -> SatisfactionDto.builder()
                        .satisfactionId(s.getSatisfactionId())
                        .articleId(s.getArticleId())
                        .boardId(s.getBoardId())
                        .writerId(s.getWriterId())
                        .writerNm(s.getWriterNm())
                        .satisfactionLevel(s.getSatisfactionLevel())
                        .satisfactionOpinion(s.getSatisfactionOpinion())
                        .createdDate(s.getCreatedDate())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public Double getAverageSatisfaction(Long articleId, String boardId) {
        return satisfactionRepository.getAverageSatisfaction(articleId, boardId);
    }

    @Override
    public SatisfactionDto getSatisfaction(String satisfactionId) {
        Satisfaction satisfaction = satisfactionRepository.findById(satisfactionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return SatisfactionDto.builder()
                .satisfactionId(satisfaction.getSatisfactionId())
                .articleId(satisfaction.getArticleId())
                .boardId(satisfaction.getBoardId())
                .writerId(satisfaction.getWriterId())
                .writerNm(satisfaction.getWriterNm())
                .satisfactionLevel(satisfaction.getSatisfactionLevel())
                .satisfactionOpinion(satisfaction.getSatisfactionOpinion())
                .useAt(satisfaction.getUseAt())
                .createdDate(satisfaction.getCreatedDate())
                .build();
    }

    @Override
    public boolean checkPassword(String satisfactionId, String password) {
        Satisfaction satisfaction = satisfactionRepository.findById(satisfactionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        // Simple string comparison for legacy support, ideally use encoder
        // Legacy controller encrypts before calling service usually?
        // EgovArticleCommentController encrypts in controller.
        // Assuming password passed here is already encrypted if needed or raw.
        // Legacy: EgovFileScrty.encryptPassword(satisfactionVO.getConfirmPassword()...)
        // The service should likely compare strictly.
        if (satisfaction.getPassword() == null)
            return false;
        return satisfaction.getPassword().equals(password);
    }
}
