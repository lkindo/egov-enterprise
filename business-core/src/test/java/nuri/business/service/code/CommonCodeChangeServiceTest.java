package nuri.business.service.code;

import nuri.business.domain.code.CommonCodeChange;
import nuri.business.domain.code.CommonCodeChangeRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.code.dto.CommonCodeChangeDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/** 공통코드 변경 이력 조회(2026-09-27 DIP B5 F11). */
@ExtendWith(MockitoExtension.class)
@DisplayName("공통코드 변경 이력 조회")
class CommonCodeChangeServiceTest {

    @Mock
    private CommonCodeChangeRepository changeRepository;
    @Mock
    private UserRepository userRepository;
    @InjectMocks
    private CommonCodeChangeService service;

    private static CommonCodeChange change(String actor) {
        return CommonCodeChange.builder().chgTrgtTypeCd("CODE").chgTypeCd("UPDATE").cdId("GRP1")
                .chgArtclNm("명칭").chgBfrCn("명칭: A").chgAftrCn("명칭: B").chgUserIdntfr(actor)
                .frstRgtrId("admin").crtDt(LocalDateTime.of(2026, 9, 27, 10, 0)).build();
    }

    @Test
    @DisplayName("그룹 ID 를 주면 그 그룹의 이력만 읽고, 변경자는 이름으로 싣는다 — 이름을 못 찾으면 null")
    void groupFilterAndActorNames() {
        PageRequest page = PageRequest.of(0, 20);
        given(changeRepository.findByCdIdOrderByCrtDtDescComCdChgHstrySnDesc("GRP1", page))
                .willReturn(new PageImpl<>(List.of(change("E1"), change("E_GONE"), change(null)), page, 3));
        User user = User.builder().esntlId("E1").userId("kim").userNm("김갑").pswd("x").build();
        given(userRepository.findByEsntlIdIn(List.of("E1", "E_GONE"))).willReturn(List.of(user));

        List<CommonCodeChangeDto> rows = service.getChanges(" GRP1 ", null, page).getContent();

        assertThat(rows).extracting(CommonCodeChangeDto::chgUserNm).containsExactly("김갑", null, null);
        assertThat(rows.get(0).chgBfrCn()).isEqualTo("명칭: A");
        verify(changeRepository, never()).findAllByOrderByCrtDtDescComCdChgHstrySnDesc(any());
    }

    @Test
    @DisplayName("그룹 ID 가 없으면 전체 이력을 읽고, 변경자가 없으면 사용자 조회를 하지 않는다")
    void allChangesWithoutActors() {
        PageRequest page = PageRequest.of(0, 20);
        given(changeRepository.findAllByOrderByCrtDtDescComCdChgHstrySnDesc(page))
                .willReturn(new PageImpl<>(List.of(change(null)), page, 1));

        assertThat(service.getChanges("", " ", page).getTotalElements()).isEqualTo(1);
        verify(userRepository, never()).findByEsntlIdIn(any());
    }

    @Test
    @DisplayName("분류 코드를 주면 그 분류 자신의 이력만 읽는다 — 소속 그룹의 이력은 섞지 않는다")
    void classificationFilterReadsOwnRowsOnly() {
        PageRequest page = PageRequest.of(0, 20);
        given(changeRepository.findByChgTrgtTypeCdAndClsfCdOrderByCrtDtDescComCdChgHstrySnDesc("CLSF", "CL1", page))
                .willReturn(new PageImpl<>(List.of(), page, 0));

        assertThat(service.getChanges(null, " CL1 ", page).getTotalElements()).isZero();
        verify(changeRepository, never()).findByCdIdOrderByCrtDtDescComCdChgHstrySnDesc(any(), any());
        verify(changeRepository, never()).findAllByOrderByCrtDtDescComCdChgHstrySnDesc(any());
    }

    @Test
    @DisplayName("그룹 ID 와 분류 코드를 함께 주면 어느 이력인지 정할 수 없어 거부한다")
    void groupAndClassificationTogetherIsRejected() {
        PageRequest page = PageRequest.of(0, 20);
        assertThatThrownBy(() -> service.getChanges("GRP1", "CL1", page))
                .isInstanceOf(nuri.foundation.core.exception.BusinessException.class);
        verify(changeRepository, never()).findAllByOrderByCrtDtDescComCdChgHstrySnDesc(any());
    }
}
