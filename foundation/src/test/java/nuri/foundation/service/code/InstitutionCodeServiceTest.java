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
        InstitutionCode entity = InstitutionCode.builder().instCd("INST1").allInstNm("Inst 1").build();
        Page<InstitutionCode> page = new PageImpl<>(List.of(entity));
        when(institutionCodeRepository.searchInstitutionCodes(any(), any(), any())).thenReturn(page);

        // when
        BaseSearchDto searchDto = new BaseSearchDto();
        searchDto.setPageIndex(1);
        searchDto.setPageUnit(10);
        List<InstitutionCodeDto> result = institutionCodeService.selectInstitutionCodeList(searchDto);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getInstCd()).isEqualTo("INST1");
    }

    @Test
    @DisplayName("기관코드 상세 조회")
    void selectInstitutionCodeDetail() {
        // given
        InstitutionCode entity = InstitutionCode.builder().instCd("INST1").allInstNm("Inst 1").build();
        when(institutionCodeRepository.findById("INST1")).thenReturn(Optional.of(entity));

        // when
        InstitutionCodeDto result = institutionCodeService.selectInstitutionCodeDetail(InstitutionCodeDto.builder().instCd("INST1").build());

        // then
        assertThat(result).isNotNull();
        assertThat(result.getInstCd()).isEqualTo("INST1");
    }

    @Test
    @DisplayName("기관코드 상세 조회 - 존재하지 않음")
    void selectInstitutionCodeDetail_NotFound() {
        // given
        when(institutionCodeRepository.findById("NOT_EXIST")).thenReturn(Optional.empty());

        // when
        InstitutionCodeDto result = institutionCodeService.selectInstitutionCodeDetail(InstitutionCodeDto.builder().instCd("NOT_EXIST").build());

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
        InstitutionCodeRecptnLog logEntity = mock(InstitutionCodeRecptnLog.class);
        when(institutionCodeRecptnLogRepository.findById(any())).thenReturn(Optional.of(logEntity));

        // when
        InstitutionCodeRecptnDto dto = InstitutionCodeRecptnDto.builder()
                .ocrnYmd("20240101")
                .instCd("I1")
                .jobSn(1L)
                .procSe("1")
                .build();
        institutionCodeService.updateInstitutionCodeRecptn(dto);

        // then
        verify(logEntity).updateProcessSe(eq("1"), anyString());
    }

    @Test
    @DisplayName("기관코드 목록 전체 개수 조회")
    void selectInstitutionCodeListTotCnt() {
        when(institutionCodeRepository.count()).thenReturn(5L);
        int count = institutionCodeService.selectInstitutionCodeListTotCnt(new BaseSearchDto());
        assertThat(count).isEqualTo(5);
    }

    @Test
    @DisplayName("기관코드 수신 내역 등록")
    void insertInstitutionCodeRecptn() {
        InstitutionCodeRecptnDto dto = InstitutionCodeRecptnDto.builder()
                .instCd("INST1")
                .chgSeCd("I")
                .build();
        
        institutionCodeService.insertInstitutionCodeRecptn(dto);
        verify(institutionCodeRecptnLogRepository).save(any(InstitutionCodeRecptnLog.class));
    }

    @Test
    @DisplayName("기관코드 등록 - 성공")
    void insertInstitutionCode_Success() {
        InstitutionCodeDto dto = InstitutionCodeDto.builder().instCd("INST2").build();
        when(institutionCodeRepository.existsById("INST2")).thenReturn(false);
        
        institutionCodeService.insertInstitutionCode(dto);
        verify(institutionCodeRepository).save(any(InstitutionCode.class));
    }

    @Test
    @DisplayName("기관코드 등록 - 중복 예외 발생")
    void insertInstitutionCode_Duplicate() {
        InstitutionCodeDto dto = InstitutionCodeDto.builder().instCd("INST2").build();
        when(institutionCodeRepository.existsById("INST2")).thenReturn(true);
        
        org.junit.jupiter.api.Assertions.assertThrows(nuri.foundation.core.exception.BusinessException.class, 
            () -> institutionCodeService.insertInstitutionCode(dto));
    }

    @Test
    @DisplayName("기관코드 수정")
    void updateInstitutionCode() {
        InstitutionCodeDto dto = InstitutionCodeDto.builder().instCd("INST2").allInstNm("Update").build();
        InstitutionCode entity = mock(InstitutionCode.class);
        when(institutionCodeRepository.findById("INST2")).thenReturn(Optional.of(entity));
        
        institutionCodeService.updateInstitutionCode(dto);
        verify(entity).update(eq("Update"), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), anyString());
    }

    @Test
    @DisplayName("기관코드 삭제")
    void deleteInstitutionCode() {
        InstitutionCodeDto dto = InstitutionCodeDto.builder().instCd("INST2").build();
        institutionCodeService.deleteInstitutionCode(dto);
        verify(institutionCodeRepository).deleteById("INST2");
    }

    // Helper static class
    private static class InstitutionCodeRecptnLogId extends nuri.foundation.domain.code.InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId {
        public InstitutionCodeRecptnLogId(String ocrnYmd, String instCd, Long jobSn) {
            super(ocrnYmd, instCd, jobSn);
        }
    }
}
