package nuri.business.service.mypage;

import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.mypage.IndividualPage;
import nuri.business.domain.mypage.IndividualPageRepository;
import nuri.business.service.mypage.dto.IndividualPageDto;
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
public class IndividualPageService {

    private final IndividualPageRepository individualPageRepository;

    @Transactional
    public void registerIndividualPage(IndividualPageDto dto) {
        IndividualPage page = IndividualPage.builder()
                .pageId(dto.getPageId())
                .pageTtl(dto.getPageTtl())
                .pageExpln(dto.getPageExpln())
                .userId(dto.getUserId())
                .build();
        individualPageRepository.save(Objects.requireNonNull(page));
    }

    @Transactional
    public void updateIndividualPage(IndividualPageDto dto) {
        IndividualPage page = individualPageRepository.findById(Objects.requireNonNull(dto.getPageId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
        page.update(dto.getPageTtl(), dto.getPageExpln());
    }

    @Transactional
    public void deleteIndividualPage(String pageId) {
        individualPageRepository.deleteById(Objects.requireNonNull(pageId));
    }

    public IndividualPageDto getIndividualPage(String userId) {
        return individualPageRepository.findByUserId(userId)
                .map(p -> IndividualPageDto.builder()
                        .pageId(p.getPageId())
                        .pageTtl(p.getPageTtl())
                        .pageExpln(p.getPageExpln())
                        .userId(p.getUserId())
                        .build())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
    }
}
