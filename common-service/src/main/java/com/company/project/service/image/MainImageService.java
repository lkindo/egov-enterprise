package com.company.project.service.image;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.image.MainImage;
import com.company.project.domain.image.MainImageRepository;
import com.company.project.service.image.dto.MainImageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MainImageService implements EgovMainImageService {

    private final MainImageRepository mainImageRepository;

    @Override
    public Page<MainImageDto> getMainImageList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return mainImageRepository.findAll(pageable).map(MainImageDto::from);
        }
        return mainImageRepository.findByImageNmContaining(keyword, pageable).map(MainImageDto::from);
    }

    @Override
    public MainImageDto getMainImage(String imageId) {
        return mainImageRepository.findById(imageId)
                .map(MainImageDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public void insertMainImage(MainImageDto dto) {
        String id = "IMAGE_" + String.format("%013d", System.currentTimeMillis());
        MainImage entity = MainImage.builder()
                .imageId(id)
                .imageNm(dto.getImageNm())
                .image(dto.getImage())
                .imageFile(dto.getImageFile())
                .imageDc(dto.getImageDc())
                .reflctAt(dto.getReflctAt())
                .build();
        mainImageRepository.save(entity);
    }

    @Override
    @Transactional
    public void updateMainImage(MainImageDto dto) {
        MainImage entity = mainImageRepository.findById(dto.getImageId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getImageNm(), dto.getImage(), dto.getImageFile(), dto.getImageDc(), dto.getReflctAt());
    }

    @Override
    @Transactional
    public void deleteMainImage(String imageId) {
        mainImageRepository.deleteById(imageId);
    }

    @Override
    public List<MainImageDto> getReflectedMainImages() {
        return mainImageRepository.findByReflctAt("Y").stream()
                .map(MainImageDto::from)
                .collect(Collectors.toList());
    }
}
