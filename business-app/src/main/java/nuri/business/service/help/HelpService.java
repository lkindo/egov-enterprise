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

    /**
     * [2026-09-02] 존재 확인을 거친다. 같은 서비스의 조회·수정은 없는 id 에 404 를 주는데 삭제만
     * {@code deleteById} 를 바로 불러, Spring Data 3 에서는 없는 id 가 <b>조용히 200</b> 으로 끝났다
     * (수정과 삭제가 같은 id 에 서로 다른 답을 했다). 화면은 성공 토스트를 띄우고 목록은 그대로다.
     */
    @Transactional
    public void deleteHpcm(Long hlpSn) {
        Hpcm entity = hpcmRepository.findById(Objects.requireNonNull(hlpSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        hpcmRepository.delete(entity);
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

    /** 존재 확인 — {@link #deleteHpcm} 과 같은 이유. */
    @Transactional
    public void deleteOnlineManual(Long onlnMnlSn) {
        var entity = onlineManualRepository.findById(Objects.requireNonNull(onlnMnlSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        onlineManualRepository.delete(entity);
    }
}
