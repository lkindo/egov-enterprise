package com.company.project.service.image;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.image.LoginImage;
import com.company.project.domain.image.LoginImageRepository;
import com.company.project.service.image.dto.ImageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoginImageService implements EgovLoginImageService {

    private final LoginImageRepository loginImageRepository;

    @Override
    public ImageDto getLoginImage(String imageId) {
        return loginImageRepository.findById(Objects.requireNonNull(imageId))
                .map(this::convertToDto)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
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
                .build();
        loginImageRepository.save(Objects.requireNonNull(loginImage));
    }

    @Override
    @Transactional
    public void updateLoginImage(ImageDto dto) {
        LoginImage loginImage = loginImageRepository.findById(Objects.requireNonNull(dto.getImageId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        loginImage.update(dto.getImageNm(), dto.getImage(), dto.getImageFile(), dto.getImageDc(), dto.getReflctAt());
    }

    @Override
    @Transactional
    public void deleteLoginImage(String imageId) {
        loginImageRepository.deleteById(Objects.requireNonNull(imageId));
    }

    @Override
    public Page<ImageDto> getLoginImageList(String searchKeyword, Pageable pageable) {
        if (searchKeyword == null || searchKeyword.isEmpty()) {
            return loginImageRepository.findAll(Objects.requireNonNull(pageable))
                    .map(this::convertToDto);
        }
        return loginImageRepository.findByImageNmContaining(searchKeyword, Objects.requireNonNull(pageable))
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
