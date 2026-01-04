package com.company.project.service.ulm;

import com.company.project.service.ulm.dto.UnityLinkDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface EgovUnityLinkService {
    UnityLinkDto getUnityLink(String unityLinkId);

    void registerUnityLink(UnityLinkDto dto);

    void updateUnityLink(UnityLinkDto dto);

    void deleteUnityLink(String unityLinkId);

    Page<UnityLinkDto> getUnityLinkList(String searchKeyword, Pageable pageable);

    List<UnityLinkDto> getUnityLinkSample();
}
