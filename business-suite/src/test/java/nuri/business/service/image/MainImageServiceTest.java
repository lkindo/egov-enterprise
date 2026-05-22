package nuri.business.service.image;

import nuri.business.domain.image.MainImage;
import nuri.business.domain.image.MainImageRepository;
import nuri.business.service.image.dto.MainImageDto;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MainImageServiceTest {

    @Mock
    private MainImageRepository mainImageRepository;

    @InjectMocks
    private MainImageService mainImageService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    private MainImage createMockImage(String id, String nm, String reflctAt) {
        return MainImage.builder()
                .imageId(id)
                .imageNm(nm)
                .reflctAt(reflctAt)
                .build();
    }

    @Test
    @DisplayName("메인 이미지 목록 조회 - 키워드 유무에 따른 분기 검증")
    void getMainImageList_keywordBranch_test() {
        PageRequest pageable = PageRequest.of(0, 10);
        when(mainImageRepository.findAll(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(createMockImage("IMG_1", "All", "Y"))));
        when(mainImageRepository.findByImgNmContaining(anyString(), any()))
                .thenReturn(new PageImpl<>(List.of(createMockImage("IMG_2", "Keyword", "Y"))));

        // Keyword null
        Page<MainImageDto> result1 = mainImageService.getMainImageList(null, pageable);
        assertEquals("IMG_1", result1.getContent().get(0).getImageId());

        // Keyword empty
        Page<MainImageDto> result2 = mainImageService.getMainImageList("", pageable);
        assertEquals("IMG_1", result2.getContent().get(0).getImageId());

        // Keyword present
        Page<MainImageDto> result3 = mainImageService.getMainImageList("test", pageable);
        assertEquals("IMG_2", result3.getContent().get(0).getImageId());
    }

    @Test
    @DisplayName("메인 이미지 상세 조회 - 성공 및 실패(404)")
    void getMainImage_test() {
        when(mainImageRepository.findById("IMG_1")).thenReturn(Optional.of(createMockImage("IMG_1", "Title", "Y")));
        when(mainImageRepository.findById("NOT_FOUND")).thenReturn(Optional.empty());

        // Success
        MainImageDto result = mainImageService.getMainImage("IMG_1");
        assertNotNull(result);

        // Not Found
        assertThrows(BusinessException.class, () -> mainImageService.getMainImage("NOT_FOUND"));
    }

    @Test
    @DisplayName("메인 이미지 추가 - 성공")
    void insertMainImage_success() {
        MainImageDto dto = MainImageDto.builder().imageId("NEW").imageNm("Name").build();
        
        mainImageService.insertMainImage(dto);

        verify(mainImageRepository).save(any(MainImage.class));
    }

    @Test
    @DisplayName("메인 이미지 수정 - 성공 및 실패(404)")
    void updateMainImage_test() {
        MainImage entity = createMockImage("IMG_1", "Old", "Y");
        when(mainImageRepository.findById("IMG_1")).thenReturn(Optional.of(entity));
        when(mainImageRepository.findById("NOT_FOUND")).thenReturn(Optional.empty());

        MainImageDto dto = MainImageDto.builder().imageId("IMG_1").imageNm("New").build();

        // Success
        mainImageService.updateMainImage(dto);
        
        // Not Found
        final MainImageDto nfDto = MainImageDto.builder().imageId("NOT_FOUND").build();
        assertThrows(BusinessException.class, () -> mainImageService.updateMainImage(nfDto));
    }

    @Test
    @DisplayName("메인 이미지 삭제 - 성공")
    void deleteMainImage_success() {
        mainImageService.deleteMainImage("IMG_1");
        verify(mainImageRepository).deleteById("IMG_1");
    }

    @Test
    @DisplayName("반영된 이미지 목록 조회 - 필터링 검증")
    void getReflectedMainImages_filterTest() {
        when(mainImageRepository.findByRfltYn("Y")).thenReturn(List.of(
                createMockImage("IMG_Y", "Show", "Y")
        ));

        List<MainImageDto> result = mainImageService.getReflectedMainImages();

        assertEquals(1, result.size());
        assertEquals("IMG_Y", result.get(0).getImageId());
    }
}
