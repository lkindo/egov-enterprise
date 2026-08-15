package nuri.business.service.system.content.banner;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.system.content.banner.Banner;
import nuri.business.domain.system.content.banner.BannerRepository;
import nuri.business.service.system.content.banner.dto.BannerDto;
import nuri.business.service.system.content.banner.dto.BannerMapper;
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
        Banner entity = Banner.builder()
                .bnrNm(dto.getBnrNm())
                .linkUrl(dto.getLinkUrl())
                .bnrImgNm(dto.getBnrImgNm())
                .bnrExpln(dto.getBnrExpln())
                .sortOrdr(dto.getSortOrdr())
                .rfltYn(dto.getRfltYn())
                .atchFileSn(dto.getAtchFileSn())
                .build();
        return bannerRepository.save(Objects.requireNonNull(entity)).getBnrSn();
    }

    @Transactional
    public void updateBanner(BannerDto dto) {
        Banner entity = bannerRepository.findById(Objects.requireNonNull(dto.getBnrSn()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getBnrNm(), dto.getLinkUrl(), dto.getBnrImgNm(),
                dto.getBnrExpln(), dto.getSortOrdr(), dto.getRfltYn(), dto.getAtchFileSn());
    }

    @Transactional
    public void deleteBanner(Long bnrSn) {
        bannerRepository.deleteById(Objects.requireNonNull(bnrSn));
    }

    public List<BannerDto> getReflectedBanners() {
        return bannerRepository.findByRfltYnOrderBySortOrdrAsc("Y").stream()
                .map(bannerMapper::toDto)
                .collect(Collectors.toList());
    }
}
