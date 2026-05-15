package nuri.business.service.board;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.board.Satisfaction;
import nuri.business.domain.board.SatisfactionRepository;
import nuri.business.service.board.dto.SatisfactionDto;
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
                .pstId(dto.getPstId())
                .bbsId(dto.getBbsId())
                .writerId(dto.getWriterId())
                .writerNm(dto.getWriterNm())
                .stsfdgLevel(dto.getStsfdgLevel())
                .stsfdgCn(dto.getStsfdgCn())
                .password(dto.getSatisfactionPassword())
                .useYn("Y")
                .createdBy(dto.getWriterId())
                .build();
        satisfactionRepository.save(Objects.requireNonNull(satisfaction));
    }

    @Override
    @Transactional
    public void updateSatisfaction(SatisfactionDto dto) {
        satisfactionRepository.findById(Objects.requireNonNull(dto.getSatisfactionId()))
                .ifPresent(s -> s.update(dto.getStsfdgLevel(), dto.getStsfdgCn(),
                        dto.getSatisfactionPassword()));
    }

    @Override
    @Transactional
    public void deleteSatisfaction(@NonNull Long satisfactionId) {
        satisfactionRepository.deleteById(Objects.requireNonNull(satisfactionId));
    }

    @Override
    public List<SatisfactionDto> getSatisfactionList(Long pstId, String bbsId) {
        return satisfactionRepository
                .findByPstIdAndBbsIdAndUseYn(Objects.requireNonNull(pstId), Objects.requireNonNull(bbsId),
                        "Y")
                .stream()
                .map(s -> SatisfactionDto.builder()
                        .satisfactionId(s.getId())
                        .pstId(s.getPstId())
                        .bbsId(s.getBbsId())
                        .writerId(s.getWriterId())
                        .writerNm(s.getWriterNm())
                        .stsfdgLevel(s.getStsfdgLevel())
                        .stsfdgCn(s.getStsfdgCn())
                        .createdDate(s.getCreatedDate())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public Double getAverageSatisfaction(Long pstId, String bbsId) {
        return satisfactionRepository.getAverageSatisfaction(Objects.requireNonNull(pstId),
                Objects.requireNonNull(bbsId));
    }

    @Override
    public SatisfactionDto getSatisfaction(@NonNull Long satisfactionId) {
        Satisfaction satisfaction = satisfactionRepository.findById(Objects.requireNonNull(satisfactionId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return SatisfactionDto.builder()
                .satisfactionId(satisfaction.getId())
                .pstId(satisfaction.getPstId())
                .bbsId(satisfaction.getBbsId())
                .writerId(satisfaction.getWriterId())
                .writerNm(satisfaction.getWriterNm())
                .stsfdgLevel(satisfaction.getStsfdgLevel())
                .stsfdgCn(satisfaction.getStsfdgCn())
                .useYn(satisfaction.getUseYn())
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
