package nuri.business.service.calendar;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.business.domain.calendar.Restde;
import nuri.business.domain.calendar.RestdeRepository;
import nuri.business.service.calendar.dto.RestdeDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@DisplayName("RestdeService 단위 테스트")
class RestdeServiceTest {

    @Mock
    private RestdeRepository restdeRepository;

    @org.mockito.Spy
    nuri.business.service.calendar.dto.RestdeMapper restdeMapper = new nuri.business.service.calendar.dto.RestdeMapperImpl();

    @InjectMocks
    private RestdeServiceImpl restdeService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("휴일 목록 조회")
    void getRestdeList() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Restde entity = Restde.builder()
                .hldySn(1)
                .hldyYmd("20260525")
                .hldyNm("석가탄신일")
                .hldyExpln("부처님오신날")
                .hldySeCd("01")
                .build();
        given(restdeRepository.searchRestde(anyString(), anyString(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<RestdeDto> result = restdeService.getRestdeList("2", "석가", pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        RestdeDto dto = result.getContent().get(0);
        assertThat(dto.getHldySn()).isEqualTo(1);
        assertThat(dto.getHldyYmd()).isEqualTo("20260525");
        assertThat(dto.getHldyNm()).isEqualTo("석가탄신일");
    }

    @Test
    @DisplayName("휴일 상세 조회")
    void getRestde() {
        // given
        Integer hldySn = 1;
        Restde entity = Restde.builder()
                .hldySn(hldySn)
                .hldyYmd("20261225")
                .hldyNm("성탄절")
                .build();
        given(restdeRepository.findById(hldySn)).willReturn(Optional.of(entity));

        // when
        RestdeDto result = restdeService.getRestde(hldySn);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getHldySn()).isEqualTo(hldySn);
        assertThat(result.getHldyNm()).isEqualTo("성탄절");
    }

    @Test
    @DisplayName("휴일 상세 조회 실패 - 존재하지 않음")
    void getRestde_fail_notFound() {
        // given
        Integer hldySn = 999;
        given(restdeRepository.findById(hldySn)).willReturn(Optional.empty());

        // when & then
        BusinessException exception = assertThrows(BusinessException.class, () ->
                restdeService.getRestde(hldySn)
        );
        assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("휴일 등록")
    void createRestde() {
        // given
        RestdeDto dto = RestdeDto.builder()
                .hldyYmd("20260505")
                .hldyNm("어린이날")
                .hldyExpln("어린이들을 위한 날")
                .hldySeCd("01")
                .build();

        // when
        restdeService.createRestde(dto);

        // then
        verify(restdeRepository).save(any(Restde.class));
    }

    @Test
    @DisplayName("휴일 수정")
    void updateRestde() {
        // given
        Integer hldySn = 1;
        Restde existingEntity = Restde.builder()
                .hldySn(hldySn)
                .hldyYmd("20260101")
                .hldyNm("신정")
                .hldyExpln("새해 첫날")
                .hldySeCd("01")
                .build();

        RestdeDto updateDto = RestdeDto.builder()
                .hldyYmd("20260101")
                .hldyNm("새해")
                .hldyExpln("새해 첫날 연휴")
                .hldySeCd("02")
                .build();

        given(restdeRepository.findById(hldySn)).willReturn(Optional.of(existingEntity));

        // when
        restdeService.updateRestde(hldySn, updateDto);

        // then
        assertThat(existingEntity.getHldyNm()).isEqualTo("새해");
        assertThat(existingEntity.getHldyExpln()).isEqualTo("새해 첫날 연휴");
        assertThat(existingEntity.getHldySeCd()).isEqualTo("02");
    }

    @Test
    @DisplayName("휴일 수정 실패 - 존재하지 않음")
    void updateRestde_fail_notFound() {
        // given
        Integer hldySn = 999;
        RestdeDto updateDto = RestdeDto.builder().hldyNm("새해").build();
        given(restdeRepository.findById(hldySn)).willReturn(Optional.empty());

        // when & then
        BusinessException exception = assertThrows(BusinessException.class, () ->
                restdeService.updateRestde(hldySn, updateDto)
        );
        assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("휴일 삭제")
    void deleteRestde() {
        // given
        Integer hldySn = 1;
        Restde entity = Restde.builder().hldySn(hldySn).build();
        given(restdeRepository.findById(hldySn)).willReturn(Optional.of(entity));

        // when
        restdeService.deleteRestde(hldySn);

        // then
        verify(restdeRepository).delete(entity);
    }

    @Test
    @DisplayName("휴일 삭제 실패 - 존재하지 않음")
    void deleteRestde_fail_notFound() {
        // given
        Integer hldySn = 999;
        given(restdeRepository.findById(hldySn)).willReturn(Optional.empty());

        // when & then
        BusinessException exception = assertThrows(BusinessException.class, () ->
                restdeService.deleteRestde(hldySn)
        );
        assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
    }
}
