package nuri.business.service.board;

import nuri.business.TestApplication;
import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.security.config.TestSecurityConfig;
import nuri.business.core.config.TestMessagingConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import nuri.business.security.annotation.WithMockCustomUser;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 대용량 데이터 처리 & 힙 메모리 누수(Memory Leak) 방어 검증 통합 테스트
 * - 30,000건의 대규모 데이터 조작 작업 수행 전후의 JVM 힙 메모리(Heap Memory) 사용 추이를 관측합니다.
 * - 가비지 컬렉션(GC) 이후 소멸되지 않고 힙 영역을 지속해서 잠식하는 잠재적인 메모리 누수 결함을 잡는 비가시적 영역의 정량 테스트입니다.
 */
@SpringBootTest(classes = TestApplication.class)
@Import({ TestSecurityConfig.class, TestMessagingConfig.class })
@ActiveProfiles("test")
class BulkDataMemoryLeakTest {

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private BoardMasterRepository boardMasterRepository;

    private String testBbsId;
    private List<String> createdPstIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        // 테스트용 대용량 데이터 마스터 게시판 생성
        testBbsId = "BBS_MEM_" + UUID.randomUUID().toString().substring(0, 8);
        BoardMaster master = BoardMaster.builder()
                .bbsId(testBbsId)
                .bbsTtl("대용량 메모리 테스트 게시판")
                .bbsTypeCd("BBST01")
                .bbsAtrbCd("BBSA01")
                .useYn("Y")
                .build();
        boardMasterRepository.saveAndFlush(master);
    }

    @AfterEach
    void tearDown() {
        // 대용량 DB 테스트 찌꺼기 완벽 소거
        if (!createdPstIds.isEmpty()) {
            boardRepository.deleteAllById(createdPstIds);
        }
        boardMasterRepository.deleteById(testBbsId);
    }

    @Test
    @DisplayName("성능/메모리 검증 - 30,000건 벌크 데이터 프로세싱 시 힙 메모리 누수 및 OOM 방어 무결성 보증")
    @WithMockCustomUser(username = "tester", role = "ADMIN", esntlId = "tester")
    void bulkDataProcessing_memoryLeakPrevention_verified() {
        Runtime runtime = Runtime.getRuntime();

        // 1. 초기 메모리 상태 측정 (가용 힙 메모리 정리 정밀화)
        System.gc();
        try { Thread.sleep(500); } catch (InterruptedException ignored) {}
        System.gc();
        long initialMemory = runtime.totalMemory() - runtime.freeMemory();

        // 2. 30,000건의 대량 가상 DTO 데이터 생성 및 메모리 맵 적재 (벌크 조작)
        int bulkSize = 30000;
        List<Board> bulkList = new ArrayList<>(bulkSize);
        for (int i = 0; i < bulkSize; i++) {
            String pstId = "PST_M_" + String.format("%06d", i) + "_" + UUID.randomUUID().toString().substring(0, 4);
            Board board = Board.builder()
                    .pstId(pstId)
                    .bbsId(testBbsId)
                    .pstTtl("벌크 테스트 제목 " + i)
                    .pstCn("벌크 테스트 내용 상세 기술 " + i)
                    .useYn("Y")
                    .userId("tester")
                    .userNm("테스터")
                    .likeCnt(0)
                    .inqCnt(0)
                    .build();
            bulkList.add(board);
            createdPstIds.add(pstId);
        }

        // 3. JPA 벌크 삽입 프로세싱 모사 (메모리 로딩 & 청크 영속성 상태)
        boardRepository.saveAll(bulkList);
        boardRepository.flush();

        // 4. 대용량 컬렉션 참조 해제 (힙에서 수거될 수 있도록 명시적 클리어)
        bulkList.clear();

        // 5. 작업 완료 후 GC 수행을 통한 메모리 복원도(Recovery Rate) 관측
        System.gc();
        try { Thread.sleep(500); } catch (InterruptedException ignored) {}
        System.gc();
        long finalMemory = runtime.totalMemory() - runtime.freeMemory();

        long memoryIncrease = finalMemory - initialMemory;
        double memoryIncreaseMb = memoryIncrease / (1024.0 * 1024.0);

        System.out.printf(">>> [JVM 힙 메모리 추이 모니터링]%n" +
                        "    - 데이터 규모: %d 건 벌크 데이터%n" +
                        "    - 초기 사용 메모리: %.2f MB%n" +
                        "    - 최종 사용 메모리 (GC 후): %.2f MB%n" +
                        "    - 유효 증가량 (메모리 누수 의심 크기): %.2f MB%n",
                bulkSize, initialMemory / (1024.0 * 1024.0), finalMemory / (1024.0 * 1024.0), memoryIncreaseMb);

        // 6. 무결성 단언: 3만 건의 데이터가 힙에 완전히 거쳐간 후에도, GC 이후 유효 힙 증가량이 50MB 이내인지 검증
        // 50MB 초과 증가 시 가비지 객체 수거 누수 결함(Memory Leak)으로 차단 게이트 실패 처리
        assertThat(memoryIncreaseMb)
                .withFailMessage("대용량 처리 후 JVM 힙 메모리 누수가 의심됩니다. 최종 증가량: %.2f MB", memoryIncreaseMb)
                .isLessThan(50.0);
    }
}
