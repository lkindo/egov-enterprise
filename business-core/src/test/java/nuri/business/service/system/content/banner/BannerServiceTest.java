package nuri.business.service.system.content.banner;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.system.content.banner.Banner;
import nuri.business.domain.system.content.banner.BannerRepository;
import nuri.business.service.system.content.banner.dto.BannerDto;
import nuri.business.service.system.content.banner.dto.BannerMapperImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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

    private BannerService bannerService;

    @Mock
    private BannerRepository bannerRepository;

    @BeforeEach
    void setUp() {
        // MapStruct 가 생성한 실제 매퍼 구현체를 주입하여 실 매핑 동작을 검증한다.
        bannerService = new BannerService(bannerRepository, new BannerMapperImpl());
    }

    @Test
    @DisplayName("배너 목록 조회 - 키워드 없음")
    void getBannerList_NoKeyword() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Banner banner = Banner.builder().bnrId("BNR_01").bnrNm("Test Banner").build();
        Page<Banner> page = new PageImpl<>(List.of(banner));

        given(bannerRepository.findAll(pageable)).willReturn(page);

        // when
        Page<BannerDto> result = bannerService.getBannerList(null, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getBnrId()).isEqualTo("BNR_01");
    }

    @Test
    @DisplayName("배너 목록 조회 - 키워드 있음")
    void getBannerList_WithKeyword() {
        // given
        String keyword = "Test";
        Pageable pageable = PageRequest.of(0, 10);
        Banner banner = Banner.builder().bnrId("BNR_01").bnrNm("Test Banner").build();
        Page<Banner> page = new PageImpl<>(List.of(banner));

        given(bannerRepository.findByBnrNmContaining(keyword, pageable)).willReturn(page);

        // when
        Page<BannerDto> result = bannerService.getBannerList(keyword, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getBnrNm()).isEqualTo("Test Banner");
    }

    @Test
    @DisplayName("배너 상세 조회 - 성공")
    void getBanner_Success() {
        // given
        Banner banner = Banner.builder().bnrId("BNR_01").bnrNm("Test Banner").build();
        given(bannerRepository.findById("BNR_01")).willReturn(Optional.of(banner));

        // when
        BannerDto result = bannerService.getBanner("BNR_01");

        // then
        assertThat(result).isNotNull();
        assertThat(result.getBnrId()).isEqualTo("BNR_01");
        assertThat(result.getBnrNm()).isEqualTo("Test Banner");
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
                .bnrNm("New Banner")
                .linkUrl("http://example.com")
                .sortOrdr(1)
                .rfltYn("Y")
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
                .bnrId("BNR_01")
                .bnrNm("Old Banner")
                .sortOrdr(1)
                .build();
        given(bannerRepository.findById("BNR_01")).willReturn(Optional.of(existingBanner));

        BannerDto updateDto = BannerDto.builder()
                .bnrId("BNR_01")
                .bnrNm("Updated Banner")
                .linkUrl("http://updated.com")
                .sortOrdr(2)
                .rfltYn("N")
                .build();

        // when
        bannerService.updateBanner(updateDto);

        // then
        assertThat(existingBanner.getBnrNm()).isEqualTo("Updated Banner");
        assertThat(existingBanner.getLinkUrl()).isEqualTo("http://updated.com");
        assertThat(existingBanner.getSortOrdr()).isEqualTo(2);
        assertThat(existingBanner.getRfltYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("배너 수정 - 실패 (존재하지 않음)")
    void updateBanner_Fail_NotFound() {
        // given
        BannerDto updateDto = BannerDto.builder().bnrId("BNR_99").build();
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
        Banner banner1 = Banner.builder().bnrId("BNR_01").bnrNm("Reflected 1").rfltYn("Y").sortOrdr(1).build();
        Banner banner2 = Banner.builder().bnrId("BNR_02").bnrNm("Reflected 2").rfltYn("Y").sortOrdr(2).build();

        given(bannerRepository.findByRfltYnOrderBySortOrdrAsc("Y")).willReturn(List.of(banner1, banner2));

        // when
        List<BannerDto> result = bannerService.getReflectedBanners();

        // then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getBnrId()).isEqualTo("BNR_01");
        assertThat(result.get(1).getBnrId()).isEqualTo("BNR_02");
    }
}
