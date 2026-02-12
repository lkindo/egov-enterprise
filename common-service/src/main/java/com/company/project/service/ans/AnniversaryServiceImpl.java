package com.company.project.service.ans;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.anniversary.Anniversary;
import com.company.project.domain.anniversary.AnniversaryDomainRepository;
import com.company.project.service.ans.dto.AnniversaryDto;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnniversaryServiceImpl implements AnniversaryService {

    private final AnniversaryDomainRepository anniversaryRepository;
    private final EgovIdGnrService egovAnnvrsryManageIdGnrService;

    @Override
    public Page<AnniversaryDto> getAnniversaryList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return anniversaryRepository.findAll(pageable).map(AnniversaryDto::from);
        }
        return anniversaryRepository.findByAnnvrsryNmContaining(keyword, pageable).map(AnniversaryDto::from);
    }

    @Override
    public List<AnniversaryDto> getUserAnniversaries(String userId) {
        return anniversaryRepository.findByUsid(userId).stream()
                .map(AnniversaryDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public AnniversaryDto getAnniversary(String annId) {
        return anniversaryRepository.findById(annId)
                .map(AnniversaryDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createAnniversary(String userId, AnniversaryDto dto) {
        try {
            String id = egovAnnvrsryManageIdGnrService.getNextStringId();
            Anniversary entity = Anniversary.builder()
                    .annId(id)
                    .usid(userId)
                    .annvrsrySe(dto.getAnnvrsrySe())
                    .annvrsryNm(dto.getAnnvrsryNm())
                    .annvrsryDe(dto.getAnnvrsryDe())
                    .cldrSe(dto.getCldrSe())
                    .reptitSe(dto.getReptitSe())
                    .annvrsrySetup(dto.getAnnvrsrySetup())
                    .annvrsryBeginDe(dto.getAnnvrsryBeginDe())
                    .memo(dto.getMemo())
                    .frstRegisterId(userId)
                    .build();
            anniversaryRepository.save(entity);
            return id;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate anniversary ID", e);
        }
    }

    @Override
    @Transactional
    public void updateAnniversary(String annId, String userId, AnniversaryDto dto) {
        Anniversary entity = anniversaryRepository.findById(annId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        
        entity.update(dto.getAnnvrsrySe(), dto.getAnnvrsryNm(), dto.getAnnvrsryDe(), dto.getCldrSe(),
                dto.getReptitSe(), dto.getAnnvrsrySetup(), dto.getAnnvrsryBeginDe(),
                dto.getMemo(), userId);
    }

    @Override
    @Transactional
    public void deleteAnniversary(String annId) {
        if (!anniversaryRepository.existsById(annId)) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND);
        }
        anniversaryRepository.deleteById(annId);
    }
}
