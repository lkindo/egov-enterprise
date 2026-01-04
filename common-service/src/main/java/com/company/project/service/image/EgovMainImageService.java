package com.company.project.service.image;

import com.company.project.service.image.dto.ImageDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovMainImageService {
    ImageDto getMainImage(String imageId);

    void registerMainImage(ImageDto dto);

    void updateMainImage(ImageDto dto);

    void deleteMainImage(String imageId);

    Page<ImageDto> getMainImageList(String searchKeyword, Pageable pageable);
}
