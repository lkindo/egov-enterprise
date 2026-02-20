package com.company.project.service.template;

import com.company.project.service.template.dto.TemplateDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

/**
 * ?쒗뵆由??쒕퉬???명꽣?섏씠??
 */
public interface EgovTemplateService {

    Page<TemplateDto> getTemplateList(String keyword, Pageable pageable);

    Page<TemplateDto> getTemplatesByType(String tmplatSeCode, Pageable pageable);

    TemplateDto getTemplate(String tmplatId);

    String createTemplate(String userId, TemplateDto dto);

    void updateTemplate(String tmplatId, String userId, TemplateDto dto);

    void deleteTemplate(String tmplatId);

    List<TemplateDto> getActiveTemplates();

    List<TemplateDto> getActiveTemplatesByType(String tmplatSeCode);
}
