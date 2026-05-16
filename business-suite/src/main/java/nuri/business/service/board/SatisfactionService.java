package nuri.business.service.board;

import nuri.business.domain.board.Satisfaction;
import nuri.business.domain.board.SatisfactionRepository;
import nuri.business.service.board.dto.SatisfactionDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.core.service.BaseAbstractService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SatisfactionService extends BaseAbstractService {

    private final SatisfactionRepository satisfactionRepository;

    @Transactional
    public void createSatisfaction(String userId, SatisfactionDto dto) {
        Satisfaction entity = Satisfaction.builder()
                .bbsId(dto.getBbsId())
                .pstId(dto.getPstId())
                .stsfdgLevel(dto.getStsfdgLevel())
                .stsfdgCn(dto.getStsfdgCn())
                .password(dto.getPassword())
                .createdBy(userId)
                .build();
        satisfactionRepository.save(entity);
    }

    // legacy
    @Transactional
    public void registerSatisfaction(SatisfactionDto dto) {
        createSatisfaction("SYSTEM", dto);
    }

    @Transactional
    public void updateSatisfaction(String userId, SatisfactionDto dto) {
        Satisfaction entity = satisfactionRepository.findById(Objects.requireNonNull(dto.getSatisfactionId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(dto.getStsfdgLevel(), dto.getStsfdgCn(), dto.getPassword());
        entity.setLastModifiedBy(userId);
    }

    // legacy
    @Transactional
    public void updateSatisfaction(SatisfactionDto dto) {
        updateSatisfaction("SYSTEM", dto);
    }

    @Transactional
    public void deleteSatisfaction(Long satisfactionId, String userId, String password) {
        Satisfaction entity = satisfactionRepository.findById(satisfactionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.delete();
        entity.setLastModifiedBy(userId);
    }

    // legacy
    @Transactional
    public void deleteSatisfaction(Long satisfactionId) {
        deleteSatisfaction(satisfactionId, "SYSTEM", null);
    }

    public List<SatisfactionDto> getSatisfactionList(String bbsId, Long pstId) {
        List<Satisfaction> list = satisfactionRepository.findByPstIdAndBbsIdAndUseYn(pstId, bbsId, "Y");
        return list.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public Double getAverageSatisfaction(String bbsId, Long pstId) {
        return satisfactionRepository.getAverageSatisfaction(pstId, bbsId);
    }

    public SatisfactionDto getSatisfaction(Long satisfactionId) {
        return satisfactionRepository.findById(satisfactionId)
                .map(this::convertToDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    public boolean checkPassword(Long satisfactionId, String password) {
        return satisfactionRepository.findById(satisfactionId)
                .map(s -> Objects.equals(s.getPassword(), password))
                .orElse(false);
    }

    private SatisfactionDto convertToDto(Satisfaction satisfaction) {
        return SatisfactionDto.builder()
                .satisfactionId(satisfaction.getStsfdgId())
                .bbsId(satisfaction.getBbsId())
                .pstId(satisfaction.getPstId())
                .stsfdgCn(satisfaction.getStsfdgCn())
                .stsfdgLevel(satisfaction.getStsfdgLevel())
                .writerId(satisfaction.getCreatedBy())
                .password(satisfaction.getPassword())
                .useYn(satisfaction.getUseYn())
                .createdDate(satisfaction.getCreatedDate())
                .build();
    }
}
