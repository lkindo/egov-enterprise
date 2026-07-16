package nuri.business.service.mypage;
<<<<<<<< HEAD:business-suite/src/main/java/nuri/business/service/mypage/IndividualPageService.java

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
========
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
>>>>>>>> 836a36bfd4aaa78fde77b65f9adb85601763ce9f:business-core/src/main/java/nuri/business/service/mypage/IndividualPageService.java
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
public class IndividualPageService implements EgovIndividualPageService {

    private final IndividualPageRepository individualPageRepository;

    @Override
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

    @Override
    @Transactional
    public void updateIndividualPage(IndividualPageDto dto) {
        IndividualPage page = individualPageRepository.findById(Objects.requireNonNull(dto.getPageId()))
<<<<<<<< HEAD:business-suite/src/main/java/nuri/business/service/mypage/IndividualPageService.java
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
========
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
>>>>>>>> 836a36bfd4aaa78fde77b65f9adb85601763ce9f:business-core/src/main/java/nuri/business/service/mypage/IndividualPageService.java
        page.update(dto.getPageTtl(), dto.getPageExpln());
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
                        .pageTtl(p.getPageTtl())
                        .pageExpln(p.getPageExpln())
                        .userId(p.getUserId())
                        .build())
<<<<<<<< HEAD:business-suite/src/main/java/nuri/business/service/mypage/IndividualPageService.java
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
========
                .orElseThrow(() -> new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND));
>>>>>>>> 836a36bfd4aaa78fde77b65f9adb85601763ce9f:business-core/src/main/java/nuri/business/service/mypage/IndividualPageService.java
    }
}
