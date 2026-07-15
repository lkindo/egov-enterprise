package nuri.business.service.help;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.help.*;
import nuri.business.service.help.dto.HpcmDto;
import nuri.business.service.help.dto.HpcmMapper;
import nuri.business.service.help.dto.OnlineManualDto;
import nuri.business.service.help.dto.OnlineManualMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

/**
 * 도움말(안내문 등) 서비스 구현 클래스
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HelpService implements EgovHelpService {

    private final HpcmRepository hpcmRepository;
    private final OnlineManualRepository onlineManualRepository;
    private final HpcmMapper hpcmMapper;
    private final OnlineManualMapper onlineManualMapper;

    // HPCM (Help)
    @Override
    public Page<HpcmDto> getHpcmList(String keyword, Pageable pageable) {
        return hpcmRepository
                .findByHlpDfnContaining(Objects.requireNonNullElse(keyword, ""), Objects.requireNonNull(pageable))
                .map(hpcmMapper::toDto);
    }

    @Override
    public HpcmDto getHpcm(String hlpId) {
        return hpcmRepository.findById(Objects.requireNonNull(hlpId))
                .map(hpcmMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createHpcm(String userId, HpcmDto dto) {
        String id = "HPCM_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 13);
        Hpcm entity = Hpcm.builder()
                .hlpId(id)
                .hlpSeCd(dto.getHlpSeCd())
                .hlpDfn(dto.getHlpDfn())
                .hlpExpln(dto.getHlpExpln())
                .build();
        hpcmRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateHpcm(String hlpId, String userId, HpcmDto dto) {
        Hpcm entity = hpcmRepository.findById(Objects.requireNonNull(hlpId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getHlpSeCd(), dto.getHlpDfn(), dto.getHlpExpln());
    }

    @Override
    @Transactional
    public void deleteHpcm(String hlpId) {
        hpcmRepository.deleteById(Objects.requireNonNull(hlpId));
    }

    // Online Manual
    @Override
    public Page<OnlineManualDto> getOnlineManualList(String keyword, Pageable pageable) {
        return onlineManualRepository
                .findByOnlnMnlNmContaining(Objects.requireNonNullElse(keyword, ""), Objects.requireNonNull(pageable))
                .map(onlineManualMapper::toDto);
    }

    @Override
    public OnlineManualDto getOnlineManual(String onlnMnlId) {
        return onlineManualRepository.findById(Objects.requireNonNull(onlnMnlId))
                .map(onlineManualMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createOnlineManual(String userId, OnlineManualDto dto) {
        if (dto == null) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        
        String id = "MNL_" + java.util.UUID.randomUUID().toString().substring(0, 8);
        OnlineManual entity = OnlineManual.builder()
                .onlnMnlId(id)
                .onlnMnlNm(dto.getOnlnMnlNm() != null ? dto.getOnlnMnlNm() : "Untitled")
                .onlnMnlSeCd(dto.getOnlnMnlSeCd() != null ? dto.getOnlnMnlSeCd() : "GNR")
                .onlnMnlDfn(dto.getOnlnMnlDfn() != null ? dto.getOnlnMnlDfn() : "")
                .onlnMnlExpln(dto.getOnlnMnlExpln() != null ? dto.getOnlnMnlExpln() : "")
                .build();
        
        onlineManualRepository.save(entity);
        return id;
    }

    @Override
    @Transactional
    public void updateOnlineManual(String onlnMnlId, String userId, OnlineManualDto dto) {
        OnlineManual entity = onlineManualRepository.findById(Objects.requireNonNull(onlnMnlId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getOnlnMnlNm(), dto.getOnlnMnlSeCd(), dto.getOnlnMnlDfn(), dto.getOnlnMnlExpln());
    }

    @Override
    @Transactional
    public void deleteOnlineManual(String onlnMnlId) {
        onlineManualRepository.deleteById(Objects.requireNonNull(onlnMnlId));
    }
}
