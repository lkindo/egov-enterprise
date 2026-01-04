package com.company.project.service.image;

import com.company.project.domain.image.LoginImage;
import com.company.project.domain.image.LoginImageRepository;
import com.company.project.service.image.dto.ImageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoginImageService implements EgovLoginImageService {

    private final LoginImageRepository loginImageRepository;

    @Override
    public ImageDto getLoginImage(String imageId) {
        return loginImageRepository.findById(imageId)
                .map(this::convertToDto)
                .orElse(null);
    }

    @Override
    @Transactional
    public void registerLoginImage(ImageDto dto) {
        LoginImage loginImage = LoginImage.builder()
                .imageId(dto.getImageId())
                .imageNm(dto.getImageNm())
                .image(dto.getImage())
                .imageFile(dto.getImageFile())
                .imageDc(dto.getImageDc())
                .reflctAt(dto.getReflctAt())
                .frstRegisterId("SYSTEM")
                .lastUpdusrId("SYSTEM")
                .build();
        loginImageRepository.save(loginImage);
    }

    @Override
    @Transactional
    public void updateLoginImage(ImageDto dto) {
        loginImageRepository.findById(dto.getImageId())
                .ifPresent(li -> li.update(dto.getImageNm(), dto.getImage(), dto.getImageFile(), dto.getImageDc(),
                        dto.getReflctAt(), "SYSTEM"));
    }

    @Override
    @Transactional
    public void deleteLoginImage(String imageId) {
        loginImageRepository.deleteById(imageId);
    }

    @Override
    public Page<ImageDto> getLoginImageList(String searchKeyword, Pageable pageable) {
        return loginImageRepository.findAll(pageable)
                .map(this::convertToDto);
    }

    private ImageDto convertToDto(LoginImage li) {
        return ImageDto.builder()
                .imageId(li.getImageId())
                .imageNm(li.getImageNm())
                .image(li.getImage())
                .imageFile(li.getImageFile())
                .imageDc(li.getImageDc())
                .reflctAt(li.getReflctAt())
                .build();
    }
}
