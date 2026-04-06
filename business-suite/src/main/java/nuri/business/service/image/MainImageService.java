package nuri.business.service.image;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.image.MainImage;
import nuri.business.domain.image.MainImageRepository;
import nuri.business.service.image.dto.MainImageDto;
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

    @Override
    public Page<MainImageDto> getMainImageList(String searchKeyword, Pageable pageable) {
        if (searchKeyword == null || searchKeyword.isEmpty()) {
            return mainImageRepository.findAll(Objects.requireNonNull(pageable))
                    .map(MainImageDto::from);
        }
        return mainImageRepository.findByImageNmContaining(searchKeyword, Objects.requireNonNull(pageable))
                .map(MainImageDto::from);
    }

    @Override
    public MainImageDto getMainImage(String imageId) {
        return mainImageRepository.findById(Objects.requireNonNull(imageId))
                .map(MainImageDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertMainImage(MainImageDto dto) {
        MainImage mainImage = MainImage.builder()
                .imageId(dto.getImageId())
                .imageNm(dto.getImageNm())
                .image(dto.getImage())
                .imageFile(dto.getImageFile())
                .imageDc(dto.getImageDc())
                .reflctAt(dto.getReflctAt())
                .build();
        mainImageRepository.save(Objects.requireNonNull(mainImage));
    }

    @Override
    @Transactional
    public void updateMainImage(MainImageDto dto) {
        MainImage mainImage = mainImageRepository.findById(Objects.requireNonNull(dto.getImageId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        mainImage.update(dto.getImageNm(), dto.getImage(), dto.getImageFile(), dto.getImageDc(), dto.getReflctAt());
    }

    @Override
    @Transactional
    public void deleteMainImage(String imageId) {
        mainImageRepository.deleteById(Objects.requireNonNull(imageId));
    }

    @Override
    public List<MainImageDto> getReflectedMainImages() {
        return mainImageRepository.findAll().stream()
                .filter(img -> "Y".equals(img.getReflctAt()))
                .map(MainImageDto::from)
                .collect(Collectors.toList());
    }
}
