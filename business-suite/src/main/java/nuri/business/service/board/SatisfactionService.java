package nuri.business.service.board;

import nuri.business.domain.board.Satisfaction;
import nuri.business.domain.board.SatisfactionRepository;
import nuri.business.service.board.dto.SatisfactionDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.core.service.BaseAbstractService;
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
                .dgstfnScr(dto.getDgstfnScr())
                .dgstfnCn(dto.getDgstfnCn())
                .pswd(dto.getPassword())
                .frstRgtrId(userId)
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
        Satisfaction entity = satisfactionRepository.findById(Objects.requireNonNull(dto.getDgstfnSn()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        entity.update(dto.getDgstfnScr(), dto.getDgstfnCn(), dto.getPassword());
        entity.setLastMdfrId(userId);
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
        entity.setLastMdfrId(userId);
    }

    // legacy
    @Transactional
    public void deleteSatisfaction(Long satisfactionId) {
        deleteSatisfaction(satisfactionId, "SYSTEM", null);
    }

    public List<SatisfactionDto> getSatisfactionList(String bbsId, String pstId) {
        List<Satisfaction> list = satisfactionRepository.findByPstIdAndBbsIdAndUseYn(pstId, bbsId, "Y");
        return list.stream()
                .map(SatisfactionDto::from)
                .collect(Collectors.toList());
    }

    public Double getAverageSatisfaction(String bbsId, String pstId) {
        return satisfactionRepository.getAverageSatisfaction(pstId, bbsId);
    }

    public SatisfactionDto getSatisfaction(Long satisfactionId) {
        return satisfactionRepository.findById(satisfactionId)
                .map(SatisfactionDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    public boolean checkPassword(Long satisfactionId, String password) {
        return satisfactionRepository.findById(satisfactionId)
                .map(s -> Objects.equals(s.getPswd(), password))
                .orElse(false);
    }
}
