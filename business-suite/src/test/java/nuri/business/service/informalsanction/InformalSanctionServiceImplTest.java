package nuri.business.service.informalsanction;


import nuri.business.domain.informalsanction.InformalSanction;
import nuri.business.domain.informalsanction.InformalSanctionRepository;
import nuri.foundation.service.code.EgovCommonCodeService;
import nuri.business.service.informalsanction.dto.InformalSanctionDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("InformalSanctionServiceImpl 단위 테스트")
class InformalSanctionServiceImplTest {

    @InjectMocks
    private InformalSanctionServiceImpl informalSanctionService;

    @Mock
    private InformalSanctionRepository informalSanctionRepository;

    @Mock
    private EgovCommonCodeService commonCodeService;

    @Test
    @DisplayName("비정형 결재 목록 조회 성공")
    void getInformalSanctionList_Success() {
        // given
        Page<InformalSanction> page = new PageImpl<>(List.of(InformalSanction.builder().informalSanctionId("SANC_01").build()));
        given(informalSanctionRepository.findAll(any(Pageable.class))).willReturn(page);

        // when
        Page<InformalSanctionDto> result = informalSanctionService.getInformalSanctionList(null, Pageable.unpaged());

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("비정형 결재 상세 조회 성공")
    void getInformalSanction_Success() {
        // given
        InformalSanction entity = InformalSanction.builder().informalSanctionId("SANC_01").jobSeCode("CODE1").build();
        given(informalSanctionRepository.findById("SANC_01")).willReturn(Optional.of(entity));
        given(commonCodeService.getCodesByGroup("COM075")).willReturn(List.of());

        // when
        InformalSanctionDto result = informalSanctionService.getInformalSanction("SANC_01");

        // then
        assertThat(result.getInformalSanctionId()).isEqualTo("SANC_01");
    }

    @Test
    @DisplayName("비정형 결재 등록 성공")
    void registerInformalSanction_Success() {
        // given
        InformalSanctionDto dto = InformalSanctionDto.builder().informalSanctionId("SANC_01").build();

        // when
        informalSanctionService.registerInformalSanction(dto);

        // then
        verify(informalSanctionRepository).save(any());
    }

    @Test
    @DisplayName("비정형 결재 승인/반려 성공")
    void confirmInformalSanction_Success() {
        // given
        InformalSanction entity = InformalSanction.builder().informalSanctionId("SANC_01").build();
        given(informalSanctionRepository.findById("SANC_01")).willReturn(Optional.of(entity));

        // when
        informalSanctionService.confirmInformalSanction("SANC_01", "C", "Reason");

        // then
        assertThat(entity.getConfmAt()).isEqualTo("C");
        assertThat(entity.getReturnResn()).isEqualTo("Reason");
    }
}
