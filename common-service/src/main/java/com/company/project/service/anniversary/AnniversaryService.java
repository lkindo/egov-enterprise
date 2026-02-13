package com.company.project.service.anniversary;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.anniversary.Anniversary;
import com.company.project.domain.anniversary.AnniversaryRepository;
import com.company.project.service.anniversary.dto.AnniversaryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnniversaryService implements EgovAnniversaryService {

    private final AnniversaryRepository anniversaryRepository;

    @Override
    public Page<AnniversaryDto> getAnniversaryList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return anniversaryRepository.findAll(pageable).map(AnniversaryDto::from);
        }
        return anniversaryRepository.findByAnnvrsryNmContaining(keyword, pageable).map(AnniversaryDto::from);
    }

    @Override
    public Page<AnniversaryDto> getMyAnniversaryList(String userId, Pageable pageable) {
        return anniversaryRepository.findByUsid(userId, pageable).map(AnniversaryDto::from);
    }

    @Override
    public AnniversaryDto getAnniversary(String annId) {
        return anniversaryRepository.findById(annId)
                .map(AnniversaryDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertAnniversary(String userId, AnniversaryDto dto) {
        String id = "ANN_" + String.format("%013d", System.currentTimeMillis());
        Anniversary entity = Anniversary.builder()
                .annId(id)
                .usid(userId)
                .annvrsrySe(dto.getAnnvrsrySe())
                .annvrsryNm(dto.getAnnvrsryNm())
                .annvrsryDe(dto.getAnnvrsryDe())
                .cldrSe(dto.getCldrSe())
                .annvrsrySetup(dto.getAnnvrsrySetup())
                .annvrsryBeginDe(dto.getAnnvrsryBeginDe())
                .memo(dto.getMemo())
                .reptitAt(dto.getReptitAt())
                .build();
        anniversaryRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateAnniversary(String annId, String userId, AnniversaryDto dto) {
        Anniversary entity = anniversaryRepository.findById(annId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getAnnvrsrySe(), dto.getAnnvrsryNm(), dto.getAnnvrsryDe(),
                dto.getCldrSe(), dto.getAnnvrsrySetup(), dto.getAnnvrsryBeginDe(),
                dto.getMemo(), dto.getReptitAt());
    }

    @Override
    @Transactional
    public void deleteAnniversary(String annId) {
        anniversaryRepository.deleteById(annId);
    }

    @Override
    public int checkAnniversaryDuplicate(String userId, String annvrsryDe, String annvrsryNm, String annId) {
        // Implement logic: count anniversaries with same userId, date, and name, but
        // different ID (if provided)
        if (annId == null || annId.isEmpty()) {
            return (int) anniversaryRepository.countByUsidAndAnnvrsryDeAndAnnvrsryNm(userId, annvrsryDe, annvrsryNm);
        } else {
            return (int) anniversaryRepository.countByUsidAndAnnvrsryDeAndAnnvrsryNmAndAnnIdNot(userId, annvrsryDe,
                    annvrsryNm, annId);
        }
    }
}
