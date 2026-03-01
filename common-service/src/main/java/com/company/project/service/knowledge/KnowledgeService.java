package com.company.project.service.knowledge;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.knowledge.Knowledge;
import com.company.project.domain.knowledge.KnowledgeRepository;
import com.company.project.service.knowledge.dto.KnowledgeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

/**
 * Ôßû¬Ä???????ïÌâ¨???¥—ãÏÅΩÔß?
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KnowledgeService implements EgovKnowledgeService {

    private final KnowledgeRepository knowledgeRepository;

    @Override
    public Page<KnowledgeDto> getKnowledgeList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return knowledgeRepository.findAll(Objects.requireNonNull(pageable)).map(KnowledgeDto::from);
        }
        return knowledgeRepository.searchByKeyword(keyword, Objects.requireNonNull(pageable)).map(KnowledgeDto::from);
    }

    @Override
    public KnowledgeDto getKnowledge(String knoId) {
        Knowledge knowledge = knowledgeRepository.findById(Objects.requireNonNull(knoId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return KnowledgeDto.from(knowledge);
    }

    @Override
    @Transactional
    public String createKnowledge(String userId, KnowledgeDto dto) {
        String knoId = "KNO_" + String.format("%013d", System.currentTimeMillis());

        Knowledge knowledge = Knowledge.builder()
                .knoId(knoId)
                .orgnztId(dto.getOrgnztId())
                .emplyrId(dto.getEmplyrId())
                .knoTypeCd(dto.getKnoTypeCd())
                .knoNm(dto.getKnoNm())
                .knoCn(dto.getKnoCn())
                .othbcAt(dto.getOthbcAt())
                .atchFileId(dto.getAtchFileId())
                .frstRegisterId(userId)
                .build();

        knowledgeRepository.save(Objects.requireNonNull(knowledge));
        return knoId;
    }

    @Override
    @Transactional
    public void updateKnowledge(String knoId, String userId, KnowledgeDto dto) {
        Knowledge knowledge = knowledgeRepository.findById(Objects.requireNonNull(knoId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        knowledge.update(dto.getKnoTypeCd(), dto.getKnoNm(), dto.getKnoCn(),
                dto.getOthbcAt(), dto.getAtchFileId(), userId);
    }

    @Override
    @Transactional
    public void deleteKnowledge(String knoId) {
        Knowledge knowledge = knowledgeRepository.findById(Objects.requireNonNull(knoId))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        knowledgeRepository.delete(Objects.requireNonNull(knowledge));
    }
}
