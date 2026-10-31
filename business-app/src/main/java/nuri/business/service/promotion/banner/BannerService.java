package nuri.business.service.promotion.banner;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.promotion.banner.Banner;
import nuri.business.domain.promotion.banner.BannerRepository;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.promotion.banner.dto.BannerDto;
import nuri.business.service.promotion.banner.dto.BannerMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BannerService {

    private final BannerRepository bannerRepository;
    private final BannerMapper bannerMapper;
    private final AttachmentAssignmentPolicy attachmentAssignmentPolicy;

    public Page<BannerDto> getBannerList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return bannerRepository.findAll(Objects.requireNonNull(pageable)).map(bannerMapper::toDto);
        }
        return bannerRepository.findByBnrNmContaining(keyword, Objects.requireNonNull(pageable))
                .map(bannerMapper::toDto);
    }

    public BannerDto getBanner(Long bnrSn) {
        return bannerRepository.findById(Objects.requireNonNull(bnrSn))
                .map(bannerMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public Long insertBanner(BannerDto dto) {
        SecurityUtil.assertPermission("BANNER_CREATE");
        assertLinkable(dto.getLinkUrl());
        Long atchFileSn = dto.getAtchFileSn();
        if (atchFileSn != null) {
            attachmentAssignmentPolicy.assertAssignable(atchFileSn);
        }
        Banner entity = Banner.builder()
                .bnrNm(dto.getBnrNm())
                .linkUrl(dto.getLinkUrl())
                .bnrImgNm(dto.getBnrImgNm())
                .bnrExpln(dto.getBnrExpln())
                .sortOrdr(dto.getSortOrdr())
                .rfltYn(dto.getRfltYn())
                .atchFileSn(atchFileSn)
                .build();
        return bannerRepository.save(Objects.requireNonNull(entity)).getBnrSn();
    }

    @Transactional
    public void updateBanner(BannerDto dto) {
        SecurityUtil.assertPermission("BANNER_UPDATE");
        Banner entity = bannerRepository.findById(Objects.requireNonNull(dto.getBnrSn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        // [2026-10-18] 화면이 읽은 버전과 다르면 다른 사람이 먼저 고친 것이다 — 덮지 않고 409 로 알린다.
        nuri.foundation.core.util.EntityVersions.assertCurrent(dto.getVersion(), entity.getVersion());
        if (!Objects.equals(entity.getLinkUrl(), dto.getLinkUrl())) {
            assertLinkable(dto.getLinkUrl());
        }
        Long atchFileSn = dto.getAtchFileSn();
        if (atchFileSn != null && !Objects.equals(entity.getAtchFileSn(), atchFileSn)) {
            attachmentAssignmentPolicy.assertAssignable(atchFileSn);
        }
        entity.update(dto.getBnrNm(), dto.getLinkUrl(), dto.getBnrImgNm(),
                dto.getBnrExpln(), dto.getSortOrdr(), dto.getRfltYn(), atchFileSn);
    }

    /**
     * 배너 삭제. [2026-10-18] 없는 배너는 404 다 — 종전의 {@code deleteById} 는 없는 ID 를 조용히 넘겨(Spring Data 3+)
     * 200 으로 성공처럼 보였다. 팝업 삭제({@code PopupService#deletePopup})와 같은 규칙이다.
     */
    @Transactional
    public void deleteBanner(Long bnrSn) {
        SecurityUtil.assertPermission("BANNER_DELETE");
        Banner entity = bannerRepository.findById(Objects.requireNonNull(bnrSn))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        bannerRepository.delete(entity);
    }

    private static void assertLinkable(String linkUrl) {
        if (!nuri.foundation.core.util.SafeUrls.isLinkable(linkUrl)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "링크 주소는 /로 시작하는 사이트 안 경로이거나 http(s) 주소여야 합니다.");
        }
    }

    public List<BannerDto> getReflectedBanners() {
        return bannerRepository.findByRfltYnOrderBySortOrdrAsc("Y").stream()
                .map(bannerMapper::toDto)
                .collect(Collectors.toList());
    }
}
