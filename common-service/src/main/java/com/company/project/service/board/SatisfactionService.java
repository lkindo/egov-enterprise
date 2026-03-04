package com.company.project.service.board;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.board.Satisfaction;
import com.company.project.domain.board.SatisfactionRepository;
import com.company.project.service.board.dto.SatisfactionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service("egovSatisfactionService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SatisfactionService implements EgovSatisfactionService {

    private final SatisfactionRepository satisfactionRepository;

    @Override
    @Transactional
    public void registerSatisfaction(SatisfactionDto dto) {
        Satisfaction satisfaction = Satisfaction.builder()
                .id(dto.getSatisfactionId())
                .articleId(dto.getArticleId())
                .boardId(dto.getBoardId())
                .writerId(dto.getWriterId())
                .writerNm(dto.getWriterNm())
                .satisfactionLevel(dto.getSatisfactionLevel())
                .satisfactionOpinion(dto.getSatisfactionOpinion())
                .password(dto.getSatisfactionPassword())
                .useAt("Y")
                .frstRegisterId(dto.getWriterId())
                .lastUpdusrId(dto.getWriterId())
                .build();
        satisfactionRepository.save(Objects.requireNonNull(satisfaction));
    }

    @Override
    @Transactional
    public void updateSatisfaction(SatisfactionDto dto) {
        satisfactionRepository.findById(Objects.requireNonNull(dto.getSatisfactionId()))
                .ifPresent(s -> s.update(dto.getSatisfactionLevel(), dto.getSatisfactionOpinion(), dto.getWriterId(),
                        dto.getSatisfactionPassword()));
    }

    @Override
    @Transactional
    public void deleteSatisfaction(@NonNull Long satisfactionId) {
        satisfactionRepository.deleteById(Objects.requireNonNull(satisfactionId));
    }

    @Override
    public List<SatisfactionDto> getSatisfactionList(Long articleId, String boardId) {
        return satisfactionRepository
                .findByArticleIdAndBoardIdAndUseAt(Objects.requireNonNull(articleId), Objects.requireNonNull(boardId),
                        "Y")
                .stream()
                .map(s -> SatisfactionDto.builder()
                        .satisfactionId(s.getId())
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
        return satisfactionRepository.getAverageSatisfaction(Objects.requireNonNull(articleId),
                Objects.requireNonNull(boardId));
    }

    @Override
    public SatisfactionDto getSatisfaction(@NonNull Long satisfactionId) {
        Satisfaction satisfaction = satisfactionRepository.findById(Objects.requireNonNull(satisfactionId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return SatisfactionDto.builder()
                .satisfactionId(satisfaction.getId())
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
    public boolean checkPassword(@NonNull Long satisfactionId, String password) {
        Satisfaction satisfaction = satisfactionRepository.findById(Objects.requireNonNull(satisfactionId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        if (satisfaction.getPassword() == null)
            return false;
        return satisfaction.getPassword().equals(password);
    }
}