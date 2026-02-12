package com.company.project.service.sanctn;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.sanctn.InformalSanctn;
import com.company.project.domain.sanctn.InformalSanctnRepository;
import com.company.project.service.sanctn.dto.InformalSanctnDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InformalSanctnService implements EgovInformalSanctnService {

    private final InformalSanctnRepository informalSanctnRepository;

    @Override
    public Page<InformalSanctnDto> getInfrmlSanctnList(String applcntId, Pageable pageable) {
        return informalSanctnRepository.findByApplcntId(applcntId, pageable).map(InformalSanctnDto::from);
    }

    @Override
    public Page<InformalSanctnDto> getReceivedInfrmlSanctnList(String sanctnerId, Pageable pageable) {
        return informalSanctnRepository.findBySanctnerId(sanctnerId, pageable).map(InformalSanctnDto::from);
    }

    @Override
    public InformalSanctnDto getInfrmlSanctn(String infrmlSanctnId) {
        return informalSanctnRepository.findById(infrmlSanctnId)
                .map(InformalSanctnDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void registerInfrmlSanctn(InformalSanctnDto dto) {
        String id = "ISM_" + String.format("%013d", System.currentTimeMillis());
        InformalSanctn entity = InformalSanctn.builder()
                .infrmlSanctnId(id)
                .jobSeCode(dto.getJobSeCode())
                .applcntId(dto.getApplcntId())
                .reqstDe(dto.getReqstDe())
                .sanctnerId(dto.getSanctnerId())
                .confmAt("N")
                .build();
        informalSanctnRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateInfrmlSanctn(InformalSanctnDto dto) {
        InformalSanctn entity = informalSanctnRepository.findById(dto.getInfrmlSanctnId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getJobSeCode(), dto.getReqstDe(), dto.getSanctnerId());
    }

    @Override
    @Transactional
    public void deleteInfrmlSanctn(String infrmlSanctnId) {
        informalSanctnRepository.deleteById(infrmlSanctnId);
    }

    @Override
    @Transactional
    public void confirmInfrmlSanctn(String infrmlSanctnId, String confmAt, String returnResn) {
        InformalSanctn entity = informalSanctnRepository.findById(infrmlSanctnId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.confirm(confmAt, returnResn);
    }
}
