package nuri.business.service.image;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.image.MainImage;
import nuri.business.domain.image.MainImageRepository;
import nuri.business.service.image.dto.MainImageDto;
import nuri.business.service.image.dto.MainImageMapper;
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
public class MainImageService implements EgovMainImageService {

    private final MainImageRepository mainImageRepository;
    private final MainImageMapper mainImageMapper;

    @Override
    public Page<MainImageDto> getMainImageList(String searchKeyword, Pageable pageable) {
        if (searchKeyword == null || searchKeyword.isEmpty()) {
            return mainImageRepository.findAll(Objects.requireNonNull(pageable))
                    .map(mainImageMapper::toDto);
        }
        return mainImageRepository.findByImgNmContaining(searchKeyword, Objects.requireNonNull(pageable))
                .map(mainImageMapper::toDto);
    }

    @Override
    public MainImageDto getMainImage(String imageId) {
        return mainImageRepository.findById(Objects.requireNonNull(imageId))
                .map(mainImageMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertMainImage(MainImageDto dto) {
        MainImage mainImage = MainImage.builder()
                .imgId(dto.getImgId())
                .imgNm(dto.getImgNm())
                .mainImgFilePath(dto.getMainImgFilePath())
                .imgFileNm(dto.getImgFileNm())
                .mainImgExpln(dto.getMainImgExpln())
                .rfltYn(dto.getRfltYn())
                .build();
        mainImageRepository.save(Objects.requireNonNull(mainImage));
    }

    @Override
    @Transactional
    public void updateMainImage(MainImageDto dto) {
        MainImage mainImage = mainImageRepository.findById(Objects.requireNonNull(dto.getImgId()))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));

        mainImage.update(dto.getImgNm(), dto.getMainImgFilePath(), dto.getImgFileNm(), dto.getMainImgExpln(), dto.getRfltYn());
    }

    @Override
    @Transactional
    public void deleteMainImage(String imageId) {
        mainImageRepository.deleteById(Objects.requireNonNull(imageId));
    }

    @Override
    public List<MainImageDto> getReflectedMainImages() {
        return mainImageRepository.findByRfltYn("Y").stream()
                .map(mainImageMapper::toDto)
                .collect(Collectors.toList());
    }
}
