package com.company.project.service.unitylink;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.ulm.UnityLink;
import com.company.project.domain.ulm.UnityLinkRepository;
import com.company.project.service.unitylink.dto.UnityLinkDto;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UnityLinkService implements EgovUnityLinkService {

    private final UnityLinkRepository unityLinkRepository;

    public UnityLinkService(
            @org.springframework.beans.factory.annotation.Qualifier("ulmUnityLinkRepository") UnityLinkRepository unityLinkRepository) {
        this.unityLinkRepository = unityLinkRepository;
    }

    @Override
    public Page<UnityLinkDto> getUnityLinkList(String keyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        if (keyword == null || keyword.isEmpty()) {
            return unityLinkRepository.findAll(pageable).map(UnityLinkDto::from);
        }
        return unityLinkRepository.findByUnityLinkNmContaining(keyword, pageable).map(UnityLinkDto::from);
    }

    @Override
    public UnityLinkDto getUnityLink(String unityLinkId) {
        return unityLinkRepository.findById(Objects.requireNonNull(unityLinkId))
                .map(UnityLinkDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertUnityLink(UnityLinkDto dto) {
        String id = "ULM_" + String.format("%013d", System.currentTimeMillis());
        UnityLink entity = UnityLink.builder()
                .unityLinkId(id)
                .unityLinkSeCode(dto.getUnityLinkSeCode())
                .unityLinkNm(dto.getUnityLinkNm())
                .unityLinkUrl(dto.getUnityLinkUrl())
                .unityLinkDc(dto.getUnityLinkDc())
                .build();
        unityLinkRepository.save(Objects.requireNonNull(entity));
    }

    @Override
    @Transactional
    public void updateUnityLink(UnityLinkDto dto) {
        UnityLink entity = unityLinkRepository.findById(Objects.requireNonNull(dto.getUnityLinkId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getUnityLinkSeCode(), dto.getUnityLinkNm(), dto.getUnityLinkUrl(), dto.getUnityLinkDc());
    }

    @Override
    @Transactional
    public void deleteUnityLink(String unityLinkId) {
        unityLinkRepository.deleteById(Objects.requireNonNull(unityLinkId));
    }
}
