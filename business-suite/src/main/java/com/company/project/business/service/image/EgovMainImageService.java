package com.company.project.business.service.image;

import com.company.project.business.service.image.dto.MainImageDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface EgovMainImageService {
    Page<MainImageDto> getMainImageList(String keyword, Pageable pageable);
    MainImageDto getMainImage(String imageId);
    void insertMainImage(MainImageDto dto);
    void updateMainImage(MainImageDto dto);
    void deleteMainImage(String imageId);
    List<MainImageDto> getReflectedMainImages();
}
