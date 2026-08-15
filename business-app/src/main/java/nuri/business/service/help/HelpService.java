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
public class HelpService {

    private final HpcmRepository hpcmRepository;
    private final OnlineManualRepository onlineManualRepository;
    private final HpcmMapper hpcmMapper;
    private final OnlineManualMapper onlineManualMapper;

    // HPCM (Help)
    public Page<HpcmDto> getHpcmList(String keyword, Pageable pageable) {
        return hpcmRepository
                .findByHlpDfnContaining(Objects.requireNonNullElse(keyword, ""), Objects.requireNonNull(pageable))
                .map(hpcmMapper::toDto);
    }

    public HpcmDto getHpcm(Long hlpSn) {
        return hpcmRepository.findById(Objects.requireNonNull(hlpSn))
                .map(hpcmMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public Long createHpcm(String userId, HpcmDto dto) {
        Hpcm entity = Hpcm.builder()
                .hlpSeCd(dto.getHlpSeCd())
                .hlpDfn(dto.getHlpDfn())
                .hlpExpln(dto.getHlpExpln())
                .build();
        Hpcm saved = hpcmRepository.save(Objects.requireNonNull(entity));
        return saved.getHlpSn();
    }

    @Transactional
    public void updateHpcm(Long hlpSn, String userId, HpcmDto dto) {
        Hpcm entity = hpcmRepository.findById(Objects.requireNonNull(hlpSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getHlpSeCd(), dto.getHlpDfn(), dto.getHlpExpln());
    }

    @Transactional
    public void deleteHpcm(Long hlpSn) {
        hpcmRepository.deleteById(Objects.requireNonNull(hlpSn));
    }

    // Online Manual
    public Page<OnlineManualDto> getOnlineManualList(String keyword, Pageable pageable) {
        return onlineManualRepository
                .findByOnlnMnlNmContaining(Objects.requireNonNullElse(keyword, ""), Objects.requireNonNull(pageable))
                .map(onlineManualMapper::toDto);
    }

    public OnlineManualDto getOnlineManual(Long onlnMnlSn) {
        return onlineManualRepository.findById(Objects.requireNonNull(onlnMnlSn))
                .map(onlineManualMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public Long createOnlineManual(String userId, OnlineManualDto dto) {
        if (dto == null) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
        
        OnlineManual entity = OnlineManual.builder()
                .onlnMnlNm(dto.getOnlnMnlNm() != null ? dto.getOnlnMnlNm() : "Untitled")
                .onlnMnlSeCd(dto.getOnlnMnlSeCd() != null ? dto.getOnlnMnlSeCd() : "GNR")
                .onlnMnlDfn(dto.getOnlnMnlDfn() != null ? dto.getOnlnMnlDfn() : "")
                .onlnMnlExpln(dto.getOnlnMnlExpln() != null ? dto.getOnlnMnlExpln() : "")
                .build();
        
        OnlineManual saved = onlineManualRepository.save(entity);
        return saved.getOnlnMnlSn();
    }

    @Transactional
    public void updateOnlineManual(Long onlnMnlSn, String userId, OnlineManualDto dto) {
        OnlineManual entity = onlineManualRepository.findById(Objects.requireNonNull(onlnMnlSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getOnlnMnlNm(), dto.getOnlnMnlSeCd(), dto.getOnlnMnlDfn(), dto.getOnlnMnlExpln());
    }

    @Transactional
    public void deleteOnlineManual(Long onlnMnlSn) {
        onlineManualRepository.deleteById(Objects.requireNonNull(onlnMnlSn));
    }
}
