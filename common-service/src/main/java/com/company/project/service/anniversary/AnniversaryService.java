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

import java.util.List;
import java.util.stream.Collectors;

/**
 * 기념일 관리 서비스 구현체
 */
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
        String id = "ANN_" + String.format("%016d", System.currentTimeMillis());
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
        anniversaryRepository.deleteById(annId);
    }

    @Override
    public int checkAnniversaryDuplicate(String usid, String annvrsryDe, String annvrsryNm) {
        return anniversaryRepository.countByUsidAndAnnvrsryDeAndAnnvrsryNm(usid, annvrsryDe, annvrsryNm);
    }
}
