package com.company.project.service.system;

import com.company.project.domain.system.CtsnnManage;
import com.company.project.domain.system.CtsnnManageRepository;
import com.company.project.service.system.dto.CtsnnManageDto;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;

@Service("systemCtsnnManageService")
public class CtsnnManageService extends EgovAbstractServiceImpl {

    private final CtsnnManageRepository ctsnnManageRepository;

    public CtsnnManageService(
            @org.springframework.beans.factory.annotation.Qualifier("systemCtsnnManageRepository") CtsnnManageRepository ctsnnManageRepository) {
        this.ctsnnManageRepository = ctsnnManageRepository;
    }

    @Transactional(readOnly = true)
    public Page<CtsnnManageDto> getCtsnnList(String usid, Pageable pageable) {
        return ctsnnManageRepository.findByUsid(usid == null ? "" : usid, pageable).map(CtsnnManageDto::from);
    }

    @Transactional(readOnly = true)
    public CtsnnManageDto getCtsnn(String ctsnnId) {
        CtsnnManage entity = ctsnnManageRepository.findById(Objects.requireNonNull(ctsnnId))
                .orElseThrow(() -> new RuntimeException("Ctsnn record not found"));
        return CtsnnManageDto.from(entity);
    }

    @Transactional
    public void createCtsnn(CtsnnManageDto dto) {
        CtsnnManage entity = CtsnnManage.builder()
                .ctsnnId(dto.getCtsnnId())
                .usid(dto.getUsid())
                .ctsnnCd(dto.getCtsnnCd())
                .reqstDe(dto.getReqstDe())
                .ctsnnNm(dto.getCtsnnNm())
                .trgterNm(dto.getTrgterNm())
                .brth(dto.getBrth())
                .occrrDe(dto.getOccrrDe())
                .relate(dto.getRelate())
                .remark(dto.getRemark())
                .confmAt("N")
                .build();
        ctsnnManageRepository.save(Objects.requireNonNull(entity));
    }

    @Transactional
    public void updateCtsnn(CtsnnManageDto dto) {
        CtsnnManage entity = ctsnnManageRepository.findById(Objects.requireNonNull(dto.getCtsnnId()))
                .orElseThrow(() -> new RuntimeException("Ctsnn record not found"));

        entity.setCtsnnCd(dto.getCtsnnCd());
        entity.setCtsnnNm(dto.getCtsnnNm());
        entity.setTrgterNm(dto.getTrgterNm());
        entity.setBrth(dto.getBrth());
        entity.setOccrrDe(dto.getOccrrDe());
        entity.setRelate(dto.getRelate());
        entity.setRemark(dto.getRemark());
    }

    @Transactional
    public void deleteCtsnn(String ctsnnId) {
        ctsnnManageRepository.deleteById(Objects.requireNonNull(ctsnnId));
    }

    @Transactional
    public void approveCtsnn(String ctsnnId, String sanctnerId) {
        CtsnnManage entity = ctsnnManageRepository.findById(Objects.requireNonNull(ctsnnId))
                .orElseThrow(() -> new RuntimeException("Ctsnn record not found"));
        entity.setConfmAt("Y");
        entity.setSanctnerId(sanctnerId);
        entity.setSanctnDt(LocalDateTime.now().toString());
    }
}
