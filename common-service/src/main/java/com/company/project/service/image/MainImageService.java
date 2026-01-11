package com.company.project.service.image;

import com.company.project.domain.image.MainImage;
import com.company.project.domain.image.MainImageDomainRepository;
import com.company.project.service.image.dto.ImageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MainImageService implements EgovMainImageService {

    private final MainImageDomainRepository mainImageRepository;

    @Override
    public ImageDto getMainImage(String imageId) {
        return mainImageRepository.findById(imageId)
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void registerMainImage(ImageDto dto) {
        MainImage mainImage = MainImage.builder()
                .imageId(dto.getImageId())
                .imageNm(dto.getImageNm())
                .image(dto.getImage())
                .imageFile(dto.getImageFile())
                .imageDc(dto.getImageDc())
                .reflctAt(dto.getReflctAt())
                .frstRegisterId("SYSTEM")
                .lastUpdusrId("SYSTEM")
                .build();
        mainImageRepository.save(mainImage);
    }

    @Override
    @Transactional
    public void updateMainImage(ImageDto dto) {
        mainImageRepository.findById(dto.getImageId())
                .ifPresent(mi -> mi.update(dto.getImageNm(), dto.getImage(), dto.getImageFile(), dto.getImageDc(),
                        dto.getReflctAt(), "SYSTEM"));
    }

    @Override
    @Transactional
    public void deleteMainImage(String imageId) {
        mainImageRepository.deleteById(imageId);
    }

    @Override
    public Page<ImageDto> getMainImageList(String searchKeyword, Pageable pageable) {
        return mainImageRepository.findAll(pageable)
                .map(this::convertToDto);
    }

    private ImageDto convertToDto(MainImage mi) {
        return ImageDto.builder()
                .imageId(mi.getImageId())
                .imageNm(mi.getImageNm())
                .image(mi.getImage())
                .imageFile(mi.getImageFile())
                .imageDc(mi.getImageDc())
                .reflctAt(mi.getReflctAt())
                .build();
    }
}
