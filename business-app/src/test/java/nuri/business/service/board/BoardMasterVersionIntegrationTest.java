package nuri.business.service.board;

import nuri.business.TestApplication;
import nuri.business.core.config.TestMessagingConfig;
import nuri.business.domain.board.BoardChange;
import nuri.business.domain.board.BoardChangeRepository;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.security.config.TestSecurityConfig;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.business.service.board.dto.BoardMasterUpdateRequest;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 게시판 마스터의 낙관적 잠금과 변경 이력이 실제 영속 계층에서 맞물리는지 본다(ADR-0040 결정 9·10).
 *
 * <p>[왜 통합 시험인가] 버전 증가는 Hibernate 가 flush 때 한다 — 목 저장소로는 "일괄 상태 변경 뒤 옛 버전으로 저장하면 409" 를
 * 증명할 수 없다. 이력이 변경과 같은 트랜잭션이라 롤백되면 남지 않는다는 것도 실제 트랜잭션에서만 보인다.
 */
@SpringBootTest(classes = TestApplication.class)
@Import({ TestSecurityConfig.class, TestMessagingConfig.class })
@ActiveProfiles("test")
@DisplayName("게시판 마스터 버전과 변경 이력(통합)")
class BoardMasterVersionIntegrationTest {

    /** 쓰기 서비스는 현재 권한을 다시 본다(백엔드 헌법 제8조). 권한을 따로 쥐지 않은 시험은 관리자로 돈다. */
    @org.junit.jupiter.api.BeforeEach
    void authorizeServiceGuard() {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
    }

    @org.junit.jupiter.api.AfterEach
    void clearServiceGuard() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Autowired
    private BoardMasterService boardMasterService;
    @Autowired
    private BoardMasterRepository boardMasterRepository;
    @Autowired
    private BoardChangeRepository changeRepository;
    @Autowired
    private PlatformTransactionManager transactionManager;

    private String bbsId;

    @BeforeEach
    void setUp() {
        bbsId = boardMasterService.createBoardMaster("tester", BoardMasterDto.builder()
                .bbsId("BBSMSTR_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase())
                .bbsTtl("버전 검증")
                .bbsTypeCd("BBST01")
                .bbsAtrbCd("BBSA02")
                .atchPsbltyFileSz(1024L)
                .useYn("Y")
                .build());
    }

    @AfterEach
    void tearDown() {
        boardMasterRepository.deleteById(bbsId);
    }

    @Test
    @DisplayName("일괄 상태 변경이 버전을 올려 옛 버전 저장은 409, 최신 버전 저장은 바뀐 항목만 남기고 같은 값 저장은 남기지 않는다")
    void batchStatusBumpsVersionAndStaleSaveConflicts() {
        assertThat(version()).isZero();

        boardMasterService.updateBoardMasterStatusInBatch("tester", List.of(bbsId), "N");
        assertThat(version()).as("사용 상태가 바뀌면 버전이 오른다").isEqualTo(1);
        assertThat(changes()).extracting(BoardChange::getChgTypeCd, BoardChange::getChgBfrCn, BoardChange::getChgAftrCn)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("USE", "Y", "N"));

        assertThatThrownBy(() -> boardMasterService.updateBoardMaster("tester", bbsId,
                request("늦은 저장", "Y", 0)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        assertThat(boardMasterRepository.findById(bbsId).orElseThrow().getBbsTtl()).isEqualTo("버전 검증");
        assertThat(changes()).hasSize(1);

        boardMasterService.updateBoardMaster("tester", bbsId, request("새 이름", "N", 1));
        assertThat(version()).isEqualTo(2);
        assertThat(changes()).as("사용 여부는 그대로라 이름만 더해진다").extracting(BoardChange::getChgArtclNm)
                .containsExactly("게시판 사용", "게시판 명칭");

        boardMasterService.updateBoardMaster("tester", bbsId, request("새 이름", "N", 2));
        assertThat(version()).as("바뀐 값이 없으면 버전도 그대로다").isEqualTo(2);
        assertThat(changes()).as("같은 값 저장은 이력을 남기지 않는다").hasSize(2);
    }

    @Test
    @DisplayName("변경이 롤백되면 이력도 남지 않는다")
    void historyRollsBackWithTheChange() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            boardMasterService.updateBoardMaster("tester", bbsId, request("롤백될 이름", "Y", 0));
            status.setRollbackOnly();
        });

        assertThat(boardMasterRepository.findById(bbsId).orElseThrow().getBbsTtl()).isEqualTo("버전 검증");
        assertThat(changes()).isEmpty();
    }

    private BoardMasterUpdateRequest request(String title, String useYn, int version) {
        return BoardMasterUpdateRequest.builder().bbsTtl(title).atchPsbltyFileSz(1024L).useYn(useYn).version(version).build();
    }

    private int version() {
        return boardMasterRepository.findById(bbsId).orElseThrow().getVersion();
    }

    /** 오래된 것부터. */
    private List<BoardChange> changes() {
        List<BoardChange> latestFirst = changeRepository
                .findByBbsIdOrderByCrtDtDescBbsChgHstrySnDesc(bbsId, PageRequest.of(0, 50)).getContent();
        return latestFirst.reversed();
    }
}
