package com.company.project.service.mypage;

import com.company.project.domain.mypage.IndividualPage;
import com.company.project.domain.mypage.IndividualPageRepository;
import com.company.project.service.mypage.dto.IndividualPageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IndividualPageService implements EgovIndividualPageService {

    private final IndividualPageRepository individualPageRepository;

    @Override
    @Transactional
    public void registerIndividualPage(IndividualPageDto dto) {
        IndividualPage page = IndividualPage.builder()
                .pageId(dto.getPageId())
                .pageNm(dto.getPageNm())
                .pageDc(dto.getPageDc())
                .userId(dto.getUserId())
                .frstRegisterId(dto.getUserId())
                .lastUpdusrId(dto.getUserId())
                .build();
        individualPageRepository.save(Objects.requireNonNull(page));
    }

    @Override
    @Transactional
    public void updateIndividualPage(IndividualPageDto dto) {
        individualPageRepository.findById(Objects.requireNonNull(dto.getPageId()))
                .ifPresent(p -> p.update(dto.getPageNm(), dto.getPageDc(), dto.getUserId()));
    }

    @Override
    @Transactional
    public void deleteIndividualPage(String pageId) {
        individualPageRepository.deleteById(Objects.requireNonNull(pageId));
    }

    @Override
    public IndividualPageDto getIndividualPage(String userId) {
        return individualPageRepository.findByUserId(userId)
                .map(p -> IndividualPageDto.builder()
                        .pageId(p.getPageId())
                        .pageNm(p.getPageNm())
                        .pageDc(p.getPageDc())
                        .userId(p.getUserId())
                        .build())
                .orElse(null);
    }
}