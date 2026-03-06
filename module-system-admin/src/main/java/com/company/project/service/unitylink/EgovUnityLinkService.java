package com.company.project.service.unitylink;

import com.company.project.service.unitylink.dto.UnityLinkDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovUnityLinkService {
    Page<UnityLinkDto> getUnityLinkList(String keyword, Pageable pageable);

    UnityLinkDto getUnityLink(String unityLinkId);

    void insertUnityLink(UnityLinkDto dto);

    void updateUnityLink(UnityLinkDto dto);

    void deleteUnityLink(String unityLinkId);
}
