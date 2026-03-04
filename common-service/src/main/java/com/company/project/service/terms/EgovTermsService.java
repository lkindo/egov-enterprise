package com.company.project.service.terms;

import com.company.project.service.terms.dto.TermsDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.lang.NonNull;

public interface EgovTermsService {
    Page<TermsDto> getTermsList(@NonNull Pageable pageable);

    TermsDto getTerms(@NonNull String id);

    String createTerms(@NonNull String userId, @NonNull TermsDto dto);

    void updateTerms(@NonNull String id, @NonNull String userId, @NonNull TermsDto dto);

    void deleteTerms(@NonNull String id, @NonNull String userId);
}