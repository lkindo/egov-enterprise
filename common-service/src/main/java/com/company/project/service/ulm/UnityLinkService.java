package com.company.project.service.ulm;

import com.company.project.domain.ulm.UnityLink;
import com.company.project.domain.ulm.UnityLinkRepository;
import com.company.project.service.ulm.dto.UnityLinkDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UnityLinkService implements EgovUnityLinkService {

    private final UnityLinkRepository unityLinkRepository;

    @Override
    public UnityLinkDto getUnityLink(String unityLinkId) {
        return unityLinkRepository.findById(unityLinkId)
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void registerUnityLink(UnityLinkDto dto) {
        UnityLink link = UnityLink.builder()
                .unityLinkId(dto.getUnityLinkId())
                .unityLinkSeCode(dto.getUnityLinkSeCode())
                .unityLinkNm(dto.getUnityLinkNm())
                .unityLinkUrl(dto.getUnityLinkUrl())
                .unityLinkDc(dto.getUnityLinkDc())
                .frstRegisterId("SYSTEM")
                .lastUpdusrId("SYSTEM")
                .build();
        unityLinkRepository.save(link);
    }

    @Override
    @Transactional
    public void updateUnityLink(UnityLinkDto dto) {
        unityLinkRepository.findById(dto.getUnityLinkId())
                .ifPresent(link -> {
                    // UnityLink 엔티티에 update 메소드 추가 필요 시 반영
                });
    }

    @Override
    @Transactional
    public void deleteUnityLink(String unityLinkId) {
        unityLinkRepository.deleteById(unityLinkId);
    }

    @Override
    public Page<UnityLinkDto> getUnityLinkList(String searchKeyword, Pageable pageable) {
        return unityLinkRepository.findAll(pageable)
                .map(this::convertToDto);
    }

    @Override
    public List<UnityLinkDto> getUnityLinkSample() {
        return unityLinkRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private UnityLinkDto convertToDto(UnityLink link) {
        return UnityLinkDto.builder()
                .unityLinkId(link.getUnityLinkId())
                .unityLinkSeCode(link.getUnityLinkSeCode())
                .unityLinkNm(link.getUnityLinkNm())
                .unityLinkUrl(link.getUnityLinkUrl())
                .unityLinkDc(link.getUnityLinkDc())
                .build();
    }
}
