package nuri.foundation.service.code;

import nuri.foundation.domain.code.InstitutionCode;
import nuri.foundation.domain.code.InstitutionCodeRecptnLog;
import nuri.foundation.domain.code.InstitutionCodeRecptnLogRepository;
import nuri.foundation.repository.code.InstitutionCodeRepository;
import nuri.foundation.service.code.dto.InstitutionCodeDto;
import nuri.foundation.service.code.dto.InstitutionCodeRecptnDto;
import nuri.foundation.domain.common.BaseSearchDto;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("InstitutionCodeService 단위 테스트")
class InstitutionCodeServiceTest {

    @Mock
    private InstitutionCodeRepository institutionCodeRepository;

    @Mock
    private InstitutionCodeRecptnLogRepository institutionCodeRecptnLogRepository;

    @InjectMocks
    private InstitutionCodeService institutionCodeService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("기관코드 목록 조회")
    void selectInstitutionCodeList() {
        // given
        PageRequest pageable = PageRequest.of(0, 10);
        InstitutionCode entity = InstitutionCode.builder().insttCode("INST1").allInsttNm("Inst 1").build();
        Page<InstitutionCode> page = new PageImpl<>(List.of(entity));
        when(institutionCodeRepository.searchInstitutionCodes(any(), any(), any())).thenReturn(page);

        // when
        BaseSearchDto searchDto = new BaseSearchDto();
        searchDto.setPageIndex(1);
        searchDto.setPageUnit(10);
        List<InstitutionCodeDto> result = institutionCodeService.selectInstitutionCodeList(searchDto);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getInsttCode()).isEqualTo("INST1");
    }

    @Test
    @DisplayName("기관코드 상세 조회")
    void selectInstitutionCodeDetail() {
        // given
        InstitutionCode entity = InstitutionCode.builder().insttCode("INST1").allInsttNm("Inst 1").build();
        when(institutionCodeRepository.findById("INST1")).thenReturn(Optional.of(entity));

        // when
        InstitutionCodeDto result = institutionCodeService.selectInstitutionCodeDetail(InstitutionCodeDto.builder().insttCode("INST1").build());

        // then
        assertThat(result).isNotNull();
        assertThat(result.getInsttCode()).isEqualTo("INST1");
    }

    @Test
    @DisplayName("기관코드 상세 조회 - 존재하지 않음")
    void selectInstitutionCodeDetail_NotFound() {
        // given
        when(institutionCodeRepository.findById("NOT_EXIST")).thenReturn(Optional.empty());

        // when
        InstitutionCodeDto result = institutionCodeService.selectInstitutionCodeDetail(InstitutionCodeDto.builder().insttCode("NOT_EXIST").build());

        // then
        assertThat(result).isNull();
    }

    @Test
    @DisplayName("기관코드 수신 내역 조회")
    void selectInstitutionCodeRecptnList() {
        // given
        InstitutionCodeRecptnLogId id = new InstitutionCodeRecptnLogId("20240101", "I1", 1L);
        InstitutionCodeRecptnLog entity = InstitutionCodeRecptnLog.builder().id(id).build();
        when(institutionCodeRecptnLogRepository.findAll()).thenReturn(List.of(entity));

        // when
        List<InstitutionCodeRecptnDto> result = institutionCodeService.selectInstitutionCodeRecptnList(new BaseSearchDto());

        // then
        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("기관코드 수신 처리")
    void updateInstitutionCodeRecptn() {
        // given
        InstitutionCodeRecptnLogId id = new InstitutionCodeRecptnLogId("20240101", "I1", 1L);
        InstitutionCodeRecptnLog logEntity = mock(InstitutionCodeRecptnLog.class);
        when(institutionCodeRecptnLogRepository.findById(any())).thenReturn(Optional.of(logEntity));

        // when
        InstitutionCodeRecptnDto dto = InstitutionCodeRecptnDto.builder()
                .ocrnYmd("20240101")
                .insttCode("I1")
                .opertSn(1L)
                .processSe("1")
                .build();
        institutionCodeService.updateInstitutionCodeRecptn(dto);

        // then
        verify(logEntity).updateProcessSe(eq("1"), anyString());
    }

    // Helper static class if needed or import
    private static class InstitutionCodeRecptnLogId extends InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId {
        public InstitutionCodeRecptnLogId(String ocrnYmd, String insttCode, Long opertSn) {
            super(ocrnYmd, insttCode, opertSn);
        }
    }
}
