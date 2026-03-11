package com.company.project.service.banner;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.system.content.banner.Banner;
import com.company.project.domain.system.content.banner.BannerRepository;
import com.company.project.service.system.content.banner.dto.BannerDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BannerService 테스트")
class BannerServiceTest {

    @Mock
    private BannerRepository bannerRepository;

    @InjectMocks
    private BannerService bannerService;

    @Nested
    @DisplayName("배너 목록 조회 테스트")
    class GetBannerListTests {

        @Test
        @DisplayName("키워드 없이 전체 배너 목록 조회 성공")
        void testGetBannerList_NoKeyword() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Banner banner1 = createMockBanner("BANNER_001", "배너 1");
            Banner banner2 = createMockBanner("BANNER_002", "배너 2");
            Page<Banner> page = new PageImpl<>(Arrays.asList(banner1, banner2), pageable, 2);

            when(bannerRepository.findAll(pageable)).thenReturn(page);

            // When
            Page<BannerDto> result = bannerService.getBannerList(null, pageable);

            // Then
            assertNotNull(result);
            assertEquals(2, result.getContent().size());
            verify(bannerRepository, times(1)).findAll(pageable);
        }

        @Test
        @DisplayName("키워드로 배너 목록 검색 성공")
        void testGetBannerList_WithKeyword() {
            // Given
            String keyword = "이벤트";
            Pageable pageable = PageRequest.of(0, 10);
            Banner banner = createMockBanner("BANNER_001", "이벤트 배너");
            Page<Banner> page = new PageImpl<>(List.of(banner), pageable, 1);

            when(bannerRepository.findByBannerNmContaining(keyword, pageable)).thenReturn(page);

            // When
            Page<BannerDto> result = bannerService.getBannerList(keyword, pageable);

            // Then
            assertNotNull(result);
            assertEquals(1, result.getContent().size());
            verify(bannerRepository, times(1)).findByBannerNmContaining(keyword, pageable);
        }

        @Test
        @DisplayName("빈 키워드로 조회 시 전체 목록 반환")
        void testGetBannerList_EmptyKeyword() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<Banner> page = Page.empty(pageable);

            when(bannerRepository.findAll(pageable)).thenReturn(page);

            // When
            Page<BannerDto> result = bannerService.getBannerList("", pageable);

            // Then
            assertNotNull(result);
            assertTrue(result.isEmpty());
        }
    }

    @Nested
    @DisplayName("개별 배너 조회 테스트")
    class GetBannerTests {

        @Test
        @DisplayName("배너 ID 로 단일 배너 조회 성공")
        void testGetBanner_Success() {
            // Given
            String bannerId = "BANNER_001";
            Banner banner = createMockBanner(bannerId, "조회된 배너");

            when(bannerRepository.findById(bannerId)).thenReturn(Optional.of(banner));

            // When
            BannerDto result = bannerService.getBanner(bannerId);

            // Then
            assertNotNull(result);
            assertEquals(bannerId, result.getBannerId());
            verify(bannerRepository, times(1)).findById(bannerId);
        }

        @Test
        @DisplayName("존재하지 않는 배너 조회 시 예외 발생")
        void testGetBanner_NotFound() {
            // Given
            String bannerId = "NOT_EXIST";
            when(bannerRepository.findById(bannerId)).thenReturn(Optional.empty());

            // When & Then
            assertThrows(BusinessException.class, () -> {
                bannerService.getBanner(bannerId);
            });
        }

        @Test
        @DisplayName("null 배너 ID 로 조회 시 NullPointerException 발생")
        void testGetBanner_NullId() {
            // When & Then
            assertThrows(NullPointerException.class, () -> {
                bannerService.getBanner(null);
            });
        }
    }

    @Nested
    @DisplayName("배너 등록 테스트")
    class InsertBannerTests {

        @Test
        @DisplayName("새로운 배너 등록 성공")
        void testInsertBanner_Success() {
            // Given
            BannerDto dto = BannerDto.builder()
                    .bannerNm("새 배너")
                    .linkUrl("https://example.com")
                    .bannerImage("/images/banner.jpg")
                    .bannerDc("배너 설명")
                    .sortOrdr(1)
                    .reflctAt("Y")
                    .build();

            when(bannerRepository.save(any(Banner.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // When
            bannerService.insertBanner(dto);

            // Then
            verify(bannerRepository, times(1)).save(any(Banner.class));
        }

        @Test
        @DisplayName("배너 등록 시 자동 ID 생성")
        void testInsertBanner_AutoGeneratedId() {
            // Given
            BannerDto dto = BannerDto.builder()
                    .bannerNm("테스트 배너")
                    .linkUrl("https://test.com")
                    .build();

            when(bannerRepository.save(any(Banner.class))).thenAnswer(invocation -> {
                Banner entity = invocation.getArgument(0);
                return entity;
            });

            // When
            bannerService.insertBanner(dto);

            // Then
            verify(bannerRepository, times(1)).save(
                    argThat(banner -> banner.getBannerId() != null && banner.getBannerId().startsWith("BANNER_")));
        }
    }

    @Nested
    @DisplayName("배너 수정 테스트")
    class UpdateBannerTests {

        @Test
        @DisplayName("배너 정보 수정 성공")
        void testUpdateBanner_Success() {
            // Given
            String bannerId = "BANNER_001";
            Banner existing = createMockBanner(bannerId, "원래 배너");

            BannerDto dto = BannerDto.builder()
                    .bannerId(bannerId)
                    .bannerNm("수정된 배너")
                    .linkUrl("https://updated.com")
                    .bannerImage("/images/updated.jpg")
                    .bannerDc("수정된 설명")
                    .sortOrdr(2)
                    .reflctAt("N")
                    .build();

            when(bannerRepository.findById(bannerId)).thenReturn(Optional.of(existing));

            // When
            bannerService.updateBanner(dto);

            // Then
            verify(bannerRepository, times(1)).findById(bannerId);
            assertEquals("수정된 배너", existing.getBannerNm());
            assertEquals("https://updated.com", existing.getLinkUrl());
            assertEquals("N", existing.getReflctAt());
        }

        @Test
        @DisplayName("존재하지 않는 배너 수정 시 예외 발생")
        void testUpdateBanner_NotFound() {
            // Given
            BannerDto dto = BannerDto.builder()
                    .bannerId("NOT_EXIST")
                    .bannerNm("수정된 배너")
                    .build();

            when(bannerRepository.findById("NOT_EXIST")).thenReturn(Optional.empty());

            // When & Then
            assertThrows(BusinessException.class, () -> {
                bannerService.updateBanner(dto);
            });
        }
    }

    @Nested
    @DisplayName("배너 삭제 테스트")
    class DeleteBannerTests {

        @Test
        @DisplayName("배너 삭제 성공")
        void testDeleteBanner_Success() {
            // Given
            String bannerId = "BANNER_001";
            doNothing().when(bannerRepository).deleteById(bannerId);

            // When
            bannerService.deleteBanner(bannerId);

            // Then
            verify(bannerRepository, times(1)).deleteById(bannerId);
        }

        @Test
        @DisplayName("null 배너 ID 로 삭제 시 NullPointerException 발생")
        void testDeleteBanner_NullId() {
            // When & Then
            assertThrows(NullPointerException.class, () -> {
                bannerService.deleteBanner(null);
            });
        }
    }

    @Nested
    @DisplayName("반영된 배너 목록 조회 테스트")
    class GetReflectedBannersTests {

        @Test
        @DisplayName("반영된 배너 목록 조회 성공")
        void testGetReflectedBanners_Success() {
            // Given
            Banner banner1 = createMockBanner("BANNER_001", "배너 1");
            Banner banner2 = createMockBanner("BANNER_002", "배너 2");
            List<Banner> banners = Arrays.asList(banner1, banner2);

            when(bannerRepository.findByReflctAtOrderBySortOrdrAsc("Y")).thenReturn(banners);

            // When
            List<BannerDto> result = bannerService.getReflectedBanners();

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
            verify(bannerRepository, times(1)).findByReflctAtOrderBySortOrdrAsc("Y");
        }

        @Test
        @DisplayName("반영된 배너가 없을 때 빈 리스트 반환")
        void testGetReflectedBanners_Empty() {
            // Given
            when(bannerRepository.findByReflctAtOrderBySortOrdrAsc("Y")).thenReturn(List.of());

            // When
            List<BannerDto> result = bannerService.getReflectedBanners();

            // Then
            assertNotNull(result);
            assertTrue(result.isEmpty());
        }
    }

    // Helper method to create mock Banner
    private Banner createMockBanner(String bannerId, String bannerNm) {
        return Banner.builder()
                .bannerId(bannerId)
                .bannerNm(bannerNm)
                .linkUrl("https://example.com")
                .bannerImage("/images/banner.jpg")
                .bannerDc("배너 설명")
                .sortOrdr(1)
                .reflctAt("Y")
                .build();
    }
}
