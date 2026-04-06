package nuri.foundation.service.mypage;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.mypage.IndividualPage;
import nuri.foundation.domain.mypage.IndividualPageRepository;
import nuri.foundation.service.mypage.dto.IndividualPageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

/**
 * 마이페이지 개인설정 서비스 구현체
 */
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
                .createdBy(dto.getUserId())
                .build();
        individualPageRepository.save(Objects.requireNonNull(page));
    }

    @Override
    @Transactional
    public void updateIndividualPage(IndividualPageDto dto) {
        IndividualPage page = individualPageRepository.findById(Objects.requireNonNull(dto.getPageId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
        page.update(dto.getPageNm(), dto.getPageDc());
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
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
    }
}
