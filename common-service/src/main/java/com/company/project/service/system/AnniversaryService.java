package com.company.project.service.system;

import com.company.project.domain.system.Anniversary;
import com.company.project.domain.system.AnniversaryRepository;
import com.company.project.service.system.dto.AnniversaryDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnniversaryService extends EgovAbstractServiceImpl {

    private final AnniversaryRepository anniversaryRepository;

    @Transactional(readOnly = true)
    public Page<AnniversaryDto> getAnniversaryList(String annvrsryNm, Pageable pageable) {
        return anniversaryRepository.findByAnnvrsryNmContaining(annvrsryNm == null ? "" : annvrsryNm, pageable).map(AnniversaryDto::from);
    }

    @Transactional(readOnly = true)
    public AnniversaryDto getAnniversary(String annId) {
        Anniversary entity = anniversaryRepository.findById(annId)
                .orElseThrow(() -> new RuntimeException("Anniversary record not found"));
        return AnniversaryDto.from(entity);
    }

    @Transactional
    public void createAnniversary(AnniversaryDto dto) {
        Anniversary entity = Anniversary.builder()
                .annId(dto.getAnnId())
                .usid(dto.getUsid())
                .annvrsrySe(dto.getAnnvrsrySe())
                .annvrsryNm(dto.getAnnvrsryNm())
                .annvrsryDe(dto.getAnnvrsryDe())
                .cldrSe(dto.getCldrSe())
                .reptitSe(dto.getReptitSe())
                .annvrsrySetup(dto.getAnnvrsrySetup())
                .annvrsryBeginDe(dto.getAnnvrsryBeginDe())
                .memo(dto.getMemo())
                .build();
        anniversaryRepository.save(entity);
    }

    @Transactional
    public void updateAnniversary(AnniversaryDto dto) {
        Anniversary entity = anniversaryRepository.findById(dto.getAnnId())
                .orElseThrow(() -> new RuntimeException("Anniversary record not found"));

        entity.setAnnvrsryNm(dto.getAnnvrsryNm());
        entity.setAnnvrsryDe(dto.getAnnvrsryDe());
        entity.setCldrSe(dto.getCldrSe());
        entity.setReptitSe(dto.getReptitSe());
        entity.setAnnvrsrySetup(dto.getAnnvrsrySetup());
        entity.setAnnvrsryBeginDe(dto.getAnnvrsryBeginDe());
        entity.setMemo(dto.getMemo());
    }

    @Transactional
    public void deleteAnniversary(String annId) {
        anniversaryRepository.deleteById(annId);
    }
}
