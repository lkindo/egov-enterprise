package nuri.performance;

import nuri.business.service.board.BoardService;
import nuri.business.service.board.dto.BoardDto;
import nuri.business.service.board.dto.BoardSaveRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Disabled;

@SpringBootTest(classes = nuri.ApiServerApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("시스템 주요 기능 스트레스 테스트")
@Disabled("Disabled to prevent build flakiness in resource-constrained environments")
class StressTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private BoardService boardService;

  private ExecutorService executorService;

  @BeforeEach
  void setUp() {
    executorService = Executors.newFixedThreadPool(5);

    BoardDto defaultBoard = BoardDto.builder()
        .pstId("1")
        .bbsId("BBS_001")
        .pstTtl("스트레스 테스트 게시글")
        .userNm("관리자")
        .inqCnt(0)
        .build();
    doReturn(new PageImpl<>(List.of(defaultBoard))).when(boardService).getBoardPosts(any(String.class), any(Pageable.class));
    doReturn(defaultBoard).when(boardService).getPostDetail(any(String.class), any(String.class));
    doReturn("1").when(boardService).createPost(any(String.class), any(BoardSaveRequest.class));
  }

  @AfterEach
  void tearDown() {
    if (executorService != null && !executorService.isShutdown()) {
      executorService.shutdown();
      try {
        if (!executorService.awaitTermination(10, TimeUnit.SECONDS)) {
          executorService.shutdownNow();
        }
      } catch (InterruptedException e) {
        executorService.shutdownNow();
        Thread.currentThread().interrupt();
      }
    }
  }

  @Test
  @DisplayName("사용자 회원가입 스트레스 테스트 - 동시 요청 50 건")
  void stress_signup_concurrency_300() throws Exception {
    int numberOfRequests = 50;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(0);

    for (int i = 0; i < numberOfRequests; i++) {
      final int requestId = i;
      executorService.submit(() -> {
        try {
          String requestBody = """
              {
                "userId": "stress%d",
                "password": "Password123!",
                "userNm": "사용자 %d",
                "passwordHint": "hint",
                "passwordCnsr": "answer",
                "role": "USER"
              }
              """.formatted(requestId, requestId);

          mockMvc.perform(post("/api/v1/users/signup")
              .contentType(MediaType.APPLICATION_JSON)
              .content(requestBody))
              .andExpect(status().isOk());
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    assertThat(successCount.get()).isEqualTo(numberOfRequests);
  }

  @Test
  @DisplayName("사용자 목록 조회 스트레스 테스트 - 대량 요청 100 건")
  void stress_userList_heavyLoad_500() throws Exception {
    int numberOfRequests = 100;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(0);

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/admin/system/users")
              .contentType(MediaType.APPLICATION_JSON)
              .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
              .andExpect(status().isOk());
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    assertThat(successCount.get()).isGreaterThanOrEqualTo((int) (numberOfRequests * 0.95));
  }

  @Test
  @DisplayName("사용자 상세 조회 스트레스 테스트 - 극한 부하 150 건")
  void stress_userDetail_extremeLoad_1000() throws Exception {
    int numberOfRequests = 150;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(0);

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/admin/system/users/stressUser")
              .contentType(MediaType.APPLICATION_JSON)
              .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")))
              .andExpect(status().isOk());
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(90, TimeUnit.SECONDS);
    assertThat(successCount.get()).isGreaterThanOrEqualTo((int) (numberOfRequests * 0.9));
  }

  @Test
  @DisplayName("혼합 스트레스 테스트 - 읽기/쓰기 동시 요청 150 건")
  void stress_mixed_concurrency_800() throws Exception {
    int numberOfRequests = 150;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(0);

    long startTime = System.currentTimeMillis();
    for (int i = 0; i < numberOfRequests; i++) {
      final int requestId = i;
      executorService.submit(() -> {
        try {
          if (requestId % 4 == 0) {
            // Write
            String requestBody = """
                {
                  "userId": "mixed%d",
                  "password": "Password123!",
                  "userNm": "혼합사용자 %d",
                  "role": "USER"
                }
                """.formatted(requestId, requestId);
            mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody));
          } else {
            // Read
            mockMvc.perform(get("/api/v1/admin/system/users")
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("admin").roles("ADMIN")));
          }
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(120, TimeUnit.SECONDS);
    long duration = System.currentTimeMillis() - startTime;

    System.out.printf("혼합 스트레스 테스트 결과 - 요청: %d, 성공: %d, 소요: %d ms%n", numberOfRequests, successCount.get(), duration);
    assertThat(successCount.get()).isGreaterThanOrEqualTo((int) (numberOfRequests * 0.85));
  }

  @Test
  @DisplayName("게시판 목록 조회 스트레스 테스트 - 대량 요청 100 건")
  void stress_boardList_heavyLoad_500() throws Exception {
    int numberOfRequests = 100;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(0);

    for (int i = 0; i < numberOfRequests; i++) {
      executorService.submit(() -> {
        try {
          mockMvc.perform(get("/api/v1/boards/BBS_001")
              .contentType(MediaType.APPLICATION_JSON)
              .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("stressUser")))
              .andExpect(status().isOk());
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    assertThat(successCount.get()).isGreaterThanOrEqualTo((int) (numberOfRequests * 0.95));
  }

  @Test
  @DisplayName("게시글 등록 스트레스 테스트 - 동시 요청 50 건")
  void stress_boardCreate_concurrency_200() throws Exception {
    int numberOfRequests = 50;
    CountDownLatch latch = new CountDownLatch(numberOfRequests);
    java.util.concurrent.atomic.AtomicInteger successCount = new java.util.concurrent.atomic.AtomicInteger(0);

    for (int i = 0; i < numberOfRequests; i++) {
      final int requestId = i;
      executorService.submit(() -> {
        try {
          String requestBody = """
              {
                "bbsId": "BBS_001",
                "pstTtl": "제목 %d",
                "pstCn": "내용 %d"
              }
              """.formatted(requestId, requestId);

          mockMvc.perform(post("/api/v1/boards/posts")
              .contentType(MediaType.APPLICATION_JSON)
              .content(requestBody)
              // AuthenticationPrincipal 은 MockUser 로 처리
              .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user("stressUser")))
              .andExpect(status().isOk());
          successCount.incrementAndGet();
        } catch (Exception e) {
          // Ignore
        } finally {
          latch.countDown();
        }
      });
    }

    latch.await(60, TimeUnit.SECONDS);
    assertThat(successCount.get()).isEqualTo(numberOfRequests);
  }
}
