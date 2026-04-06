package nuri.business.service.help;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.help.*;
import nuri.business.service.help.dto.HpcmDto;
import nuri.business.service.help.dto.OnlineManualDto;
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

    // HPCM (Help)
    @Override
    public Page<HpcmDto> getHpcmList(String keyword, Pageable pageable) {
        return hpcmRepository
                .findByHpcmDfContaining(Objects.requireNonNullElse(keyword, ""), Objects.requireNonNull(pageable))
                .map(HpcmDto::from);
    }

    @Override
    public HpcmDto getHpcm(String hpcmId) {
        return hpcmRepository.findById(Objects.requireNonNull(hpcmId))
                .map(HpcmDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createHpcm(String userId, HpcmDto dto) {
        String id = "HPCM_" + System.currentTimeMillis();
        Hpcm entity = Hpcm.builder()
                .hpcmId(id)
                .hpcmSeCode(dto.getHpcmSeCode())
                .hpcmDf(dto.getHpcmDf())
                .hpcmDc(dto.getHpcmDc())
                .build();
        hpcmRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateHpcm(String hpcmId, String userId, HpcmDto dto) {
        Hpcm entity = hpcmRepository.findById(Objects.requireNonNull(hpcmId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getHpcmSeCode(), dto.getHpcmDf(), dto.getHpcmDc());
    }

    @Override
    @Transactional
    public void deleteHpcm(String hpcmId) {
        hpcmRepository.deleteById(Objects.requireNonNull(hpcmId));
    }

    // Online Manual
    @Override
    public Page<OnlineManualDto> getOnlineManualList(String keyword, Pageable pageable) {
        return onlineManualRepository
                .findByOnlineMnlNmContaining(Objects.requireNonNullElse(keyword, ""), Objects.requireNonNull(pageable))
                .map(OnlineManualDto::from);
    }

    @Override
    public OnlineManualDto getOnlineManual(String mnlId) {
        return onlineManualRepository.findById(Objects.requireNonNull(mnlId))
                .map(OnlineManualDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createOnlineManual(String userId, OnlineManualDto dto) {
        String id = "MNL_" + System.currentTimeMillis();
        OnlineManual entity = OnlineManual.builder()
                .onlineMnlId(id)
                .onlineMnlNm(dto.getOnlineMnlNm())
                .onlineMnlSeCode(dto.getOnlineMnlSeCode())
                .onlineMnlDf(dto.getOnlineMnlDf())
                .onlineMnlDc(dto.getOnlineMnlDc())
                .build();
        onlineManualRepository.save(Objects.requireNonNull(entity));
        return id;
    }

    @Override
    @Transactional
    public void updateOnlineManual(String mnlId, String userId, OnlineManualDto dto) {
        OnlineManual entity = onlineManualRepository.findById(Objects.requireNonNull(mnlId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getOnlineMnlNm(), dto.getOnlineMnlSeCode(), dto.getOnlineMnlDf(), dto.getOnlineMnlDc());
    }

    @Override
    @Transactional
    public void deleteOnlineManual(String mnlId) {
        onlineManualRepository.deleteById(Objects.requireNonNull(mnlId));
    }
}
