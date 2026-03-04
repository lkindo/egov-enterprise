package com.company.project.service.terms;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.terms.Terms;
import com.company.project.domain.terms.TermsRepository;
import com.company.project.service.terms.dto.TermsDto;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class TermsService implements EgovTermsService {

    private final TermsRepository termsRepository;

    public TermsService(
            @org.springframework.beans.factory.annotation.Qualifier("termsRepository") TermsRepository termsRepository) {
        this.termsRepository = termsRepository;
    }

    @Override
    public Page<TermsDto> getTermsList(@NonNull Pageable pageable) {
        return termsRepository.findAll(Objects.requireNonNull(pageable)).map(TermsDto::from);
    }

    @Override
    public TermsDto getTerms(@NonNull String id) {
        Terms terms = termsRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return TermsDto.from(terms);
    }

    @Override
    @Transactional
    public String createTerms(@NonNull String userId, @NonNull TermsDto dto) {
        // ID Generation: STPLAT_ + timestamp
        String id = "STPLAT_" + String.format("%014d", System.currentTimeMillis());

        Terms terms = Terms.builder()
                .useStplatId(id)
                .useStplatNm(dto.getUseStplatNm())
                .useStplatCn(dto.getUseStplatCn())
                .infoProvdAgreCn(dto.getInfoProvdAgreCn())
                .frstRegisterId(userId)
                .build();

        termsRepository.save(Objects.requireNonNull(terms));
        return id;
    }

    @Override
    @Transactional
    public void updateTerms(@NonNull String id, @NonNull String userId, @NonNull TermsDto dto) {
        Terms terms = termsRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        terms.update(dto.getUseStplatNm(), dto.getUseStplatCn(), dto.getInfoProvdAgreCn(), userId);
    }

    @Override
    @Transactional
    public void deleteTerms(@NonNull String id, @NonNull String userId) {
        Terms terms = termsRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        termsRepository.delete(Objects.requireNonNull(terms));
    }
}