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

    public BannerDto getBanner(String bannerId) {
        return bannerRepository.findById(Objects.requireNonNull(bannerId))
                .map(bannerMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public void insertBanner(BannerDto dto) {
        String id = nuri.foundation.core.util.IdGenerationUtil.generateId("BANNER_", 13);
        Banner entity = Banner.builder()
                .bnrId(id)
                .bnrNm(dto.getBnrNm())
                .linkUrl(dto.getLinkUrl())
                .bnrImgNm(dto.getBnrImgNm())
                .bnrExpln(dto.getBnrExpln())
                .sortOrdr(dto.getSortOrdr())
                .rfltYn(dto.getRfltYn())
                .atchFileId(dto.getAtchFileId())
                .build();
        bannerRepository.save(Objects.requireNonNull(entity));
    }

    @Transactional
    public void updateBanner(BannerDto dto) {
        Banner entity = bannerRepository.findById(Objects.requireNonNull(dto.getBnrId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getBnrNm(), dto.getLinkUrl(), dto.getBnrImgNm(),
                dto.getBnrExpln(), dto.getSortOrdr(), dto.getRfltYn(), dto.getAtchFileId());
    }

    @Transactional
    public void deleteBanner(String bannerId) {
        bannerRepository.deleteById(Objects.requireNonNull(bannerId));
    }

    public List<BannerDto> getReflectedBanners() {
        return bannerRepository.findByRfltYnOrderBySortOrdrAsc("Y").stream()
                .map(bannerMapper::toDto)
                .collect(Collectors.toList());
    }
}
