package nuri.foundation.service.system.content.banner;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.system.content.banner.Banner;
import nuri.foundation.domain.system.content.banner.BannerRepository;
import nuri.foundation.service.system.content.banner.dto.BannerDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@DisplayName("BannerService 단위 테스트")
class BannerServiceTest {

    @InjectMocks
    private BannerService bannerService;

    @Mock
    private BannerRepository bannerRepository;

    @Test
    @DisplayName("배너 목록 조회 - 키워드 없음")
    void getBannerList_NoKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Banner banner = Banner.builder().bannerId("BNR_01").bannerNm("Test Banner").build();
        Page<Banner> page = new PageImpl<>(List.of(banner));

        given(bannerRepository.findAll(pageable)).willReturn(page);

        // when
        Page<BannerDto> result = bannerService.getBannerList(null, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getBannerId()).isEqualTo("BNR_01");
    }

    @Test
    @DisplayName("배너 목록 조회 - 키워드 있음")
    void getBannerList_WithKeyword() {
        // given
        String keyword = "Test";
        Pageable pageable = PageRequest.of(0, 10);
        Banner banner = Banner.builder().bannerId("BNR_01").bannerNm("Test Banner").build();
        Page<Banner> page = new PageImpl<>(List.of(banner));

        given(bannerRepository.findByBannerNmContaining(keyword, pageable)).willReturn(page);

        // when
        Page<BannerDto> result = bannerService.getBannerList(keyword, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getBannerNm()).isEqualTo("Test Banner");
    }

    @Test
    @DisplayName("배너 상세 조회 - 성공")
    void getBanner_Success() {
        // given
        Banner banner = Banner.builder().bannerId("BNR_01").bannerNm("Test Banner").build();
        given(bannerRepository.findById("BNR_01")).willReturn(Optional.of(banner));

        // when
        BannerDto result = bannerService.getBanner("BNR_01");

        // then
        assertThat(result).isNotNull();
        assertThat(result.getBannerId()).isEqualTo("BNR_01");
        assertThat(result.getBannerNm()).isEqualTo("Test Banner");
    }

    @Test
    @DisplayName("배너 상세 조회 - 실패 (존재하지 않음)")
    void getBanner_Fail_NotFound() {
        // given
        given(bannerRepository.findById("BNR_99")).willReturn(Optional.empty());

        // when & then
        assertThrows(BusinessException.class, () -> bannerService.getBanner("BNR_99"));
    }

    @Test
    @DisplayName("배너 생성 - 성공")
    void insertBanner() {
        // given
        BannerDto dto = BannerDto.builder()
                .bannerNm("New Banner")
                .linkUrl("http://example.com")
                .sortOrdr(1)
                .reflctAt("Y")
                .build();

        given(bannerRepository.save(any(Banner.class))).willAnswer(inv -> inv.getArgument(0));

        // when
        bannerService.insertBanner(dto);

        // then
        verify(bannerRepository, times(1)).save(any(Banner.class));
    }

    @Test
    @DisplayName("배너 수정 - 성공")
    void updateBanner() {
        // given
        Banner existingBanner = Banner.builder()
                .bannerId("BNR_01")
                .bannerNm("Old Banner")
                .sortOrdr(1)
                .build();
        given(bannerRepository.findById("BNR_01")).willReturn(Optional.of(existingBanner));

        BannerDto updateDto = BannerDto.builder()
                .bannerId("BNR_01")
                .bannerNm("Updated Banner")
                .linkUrl("http://updated.com")
                .sortOrdr(2)
                .reflctAt("N")
                .build();

        // when
        bannerService.updateBanner(updateDto);

        // then
        assertThat(existingBanner.getBannerNm()).isEqualTo("Updated Banner");
        assertThat(existingBanner.getLinkUrl()).isEqualTo("http://updated.com");
        assertThat(existingBanner.getSortOrdr()).isEqualTo(2);
        assertThat(existingBanner.getReflctAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("배너 수정 - 실패 (존재하지 않음)")
    void updateBanner_Fail_NotFound() {
        // given
        BannerDto updateDto = BannerDto.builder().bannerId("BNR_99").build();
        given(bannerRepository.findById("BNR_99")).willReturn(Optional.empty());

        // when & then
        assertThrows(BusinessException.class, () -> bannerService.updateBanner(updateDto));
    }

    @Test
    @DisplayName("배너 삭제 - 성공")
    void deleteBanner() {
        // given
        String bannerId = "BNR_01";

        // when
        bannerService.deleteBanner(bannerId);

        // then
        verify(bannerRepository, times(1)).deleteById(bannerId);
    }

    @Test
    @DisplayName("반영된(Reflected) 배너 목록 조회")
    void getReflectedBanners() {
        // given
        Banner banner1 = Banner.builder().bannerId("BNR_01").bannerNm("Reflected 1").reflctAt("Y").sortOrdr(1).build();
        Banner banner2 = Banner.builder().bannerId("BNR_02").bannerNm("Reflected 2").reflctAt("Y").sortOrdr(2).build();

        given(bannerRepository.findByReflctAtOrderBySortOrdrAsc("Y")).willReturn(List.of(banner1, banner2));

        // when
        List<BannerDto> result = bannerService.getReflectedBanners();

        // then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getBannerId()).isEqualTo("BNR_01");
        assertThat(result.get(1).getBannerId()).isEqualTo("BNR_02");
    }
}
