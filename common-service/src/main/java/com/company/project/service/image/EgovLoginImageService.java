package com.company.project.service.image;

import com.company.project.service.image.dto.ImageDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EgovLoginImageService {
    ImageDto getLoginImage(String imageId);

    void registerLoginImage(ImageDto dto);

    void updateLoginImage(ImageDto dto);

    void deleteLoginImage(String imageId);

    Page<ImageDto> getLoginImageList(String searchKeyword, Pageable pageable);
}
