package nuri.business.service.system.job;

import java.math.BigInteger;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import nuri.business.domain.system.job.DurableJob;
import nuri.business.domain.system.job.DurableJobRepository;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DurableWorkDispatcherTest {
    private final DurableJobRepository repository = mock(DurableJobRepository.class);
    private final DurableWorkHandler handler = mock(DurableWorkHandler.class);
    private final PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
    private final TaskScheduler scheduler = mock(TaskScheduler.class);
    private final ScheduledFuture<?> heartbeat = mock(ScheduledFuture.class);
    private final AtomicReference<Runnable> renewal = new AtomicReference<>();
    private final DurableWork work = new DurableWork(UUID.randomUUID(), "TEST", "reference");

    @BeforeEach
    void prepare() {
        when(handler.type()).thenReturn(work.type());
        when(handler.maximumConcurrentExecutions()).thenReturn(1);
        when(manager.getTransaction(any())).thenAnswer(call -> new SimpleTransactionStatus());
        when(scheduler.scheduleWithFixedDelay(any(Runnable.class), any(Instant.class), eq(Duration.ofSeconds(30))))
                .thenAnswer(call -> {
                    renewal.set(call.getArgument(0));
                    return heartbeat;
                });
    }

    @Test
    void rejectedSubmissionNeverClaimsAndAcceptedWorkClaimsOnlyInsideTheWorker() {
        var saturated = dispatcher(command -> { throw new RejectedExecutionException("full"); });
        saturated.dispatch();
        verifyNoInteractions(repository);

        List<Runnable> admitted = new ArrayList<>();
        dispatcher(admitted::add).dispatch();
        assertThat(admitted).hasSize(4);
        verifyNoInteractions(repository);

        when(repository.claimNext(any(), anyCollection())).thenReturn(Optional.empty());
        admitted.getFirst().run();
        verify(repository).claimNext(any(), anyCollection());
        verify(handler, never()).execute(any());
    }

    @Test
    void interruptedWorkerDoesNotClaimAnotherJobDuringShutdown() {
        List<Runnable> admitted = new ArrayList<>();
        dispatcher(admitted::add).dispatch();
        try {
            Thread.currentThread().interrupt();
            admitted.getFirst().run();
            verifyNoInteractions(repository);
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void renewalRunsWithTheCurrentTokenAndStopsBeforeTheSuccessAcknowledgement() {
        DurableJob job = readyJob();
        doAnswer(call -> {
            assertThat(job.getPrcsSttsNm()).isEqualTo("RUNNING");
            renewal.get().run();
            verify(repository).renewLease(eq(BigInteger.ONE), eq(job.getJobNo()), any(LocalDateTime.class));
            verify(repository, never()).findLocked(any());
            verify(heartbeat, never()).cancel(anyBoolean());
            return null;
        }).when(handler).execute(work);

        assertThat(dispatcher(Runnable::run).dispatchOne()).isTrue();

        var order = inOrder(heartbeat, repository);
        order.verify(heartbeat).cancel(false);
        order.verify(repository).findLocked(BigInteger.ONE);
        assertThat(job.getPrcsSttsNm()).isEqualTo("SUCCEEDED");
        assertThat(job.getRtryNmtm()).isEqualTo(BigInteger.ONE);
    }

    @Test
    void transientHeartbeatFailureAllowsLaterRenewalAndPreservesHandlerFailure() {
        DurableJob job = readyJob();
        when(repository.renewLease(eq(BigInteger.ONE), anyString(), any()))
                .thenThrow(new org.springframework.dao.QueryTimeoutException("unavailable"))
                .thenReturn(1);
        doAnswer(call -> {
            renewal.get().run();
            renewal.get().run();
            throw new IllegalStateException("handler failed");
        }).when(handler).execute(work);

        assertThat(dispatcher(Runnable::run).dispatchOne()).isTrue();

        verify(repository, times(2)).renewLease(eq(BigInteger.ONE), anyString(), any());
        verify(heartbeat).cancel(false);
        assertThat(job.getPrcsSttsNm()).isEqualTo("RETRY");
        assertThat(job.getRtryNmtm()).isEqualTo(BigInteger.ONE);
    }

    @Test
    void schedulerShutdownDoesNotStartAHandlerWithoutLeaseRenewal() {
        DurableJob job = readyJob();
        when(scheduler.scheduleWithFixedDelay(any(Runnable.class), any(Instant.class), any(Duration.class)))
                .thenThrow(new RejectedExecutionException("closed"));

        assertThat(dispatcher(Runnable::run).dispatchOne()).isTrue();

        verify(handler, never()).execute(any());
        assertThat(job.getPrcsSttsNm()).isEqualTo("RETRY");
    }

    @Test
    void claimCommitReservesCapacityAtomicallyAndOtherTypesProgressDuringSlowDelivery() throws Exception {
        DurableJob first = job(work, 1);
        DurableWork followingWork = new DurableWork(UUID.randomUUID(), work.type(), "following");
        DurableJob following = job(followingWork, 2);
        DurableWork otherWork = new DurableWork(UUID.randomUUID(), "OTHER", "reference");
        DurableJob other = job(otherWork, 3);
        var otherHandler = new DurableWorkHandler() {
            @Override public String type() { return otherWork.type(); }
            @Override public void execute(DurableWork delivered) { assertThat(delivered).isEqualTo(otherWork); }
        };
        var pending = new ConcurrentLinkedQueue<>(List.of(first, following, other));
        Map<BigInteger, DurableJob> jobs = Map.of(first.getJobSn(), first, following.getJobSn(), following,
                other.getJobSn(), other);
        List<List<String>> eligibleClaims = Collections.synchronizedList(new ArrayList<>());
        when(repository.claimNext(any(), anyCollection())).thenAnswer(call -> {
            Collection<String> eligible = call.getArgument(1);
            eligibleClaims.add(List.copyOf(eligible));
            return pending.stream().filter(candidate -> eligible.contains(candidate.getJobSeNm()))
                    .filter(pending::remove).findFirst();
        });
        when(repository.findLocked(any())).thenAnswer(call -> Optional.ofNullable(jobs.get(call.getArgument(0))));
        var claimCommitEntered = new CountDownLatch(1);
        var releaseClaimCommit = new CountDownLatch(1);
        var deliveryEntered = new CountDownLatch(1);
        var releaseDelivery = new CountDownLatch(1);
        var firstCommit = new AtomicBoolean(true);
        doAnswer(call -> {
            if (firstCommit.compareAndSet(true, false)) {
                claimCommitEntered.countDown();
                assertThat(releaseClaimCommit.await(5, TimeUnit.SECONDS)).isTrue();
            }
            return null;
        }).when(manager).commit(any());
        doAnswer(call -> {
            deliveryEntered.countDown();
            assertThat(releaseDelivery.await(5, TimeUnit.SECONDS)).isTrue();
            throw new IllegalStateException("slow delivery failed");
        }).when(handler).execute(work);
        var dispatcher = new DurableWorkDispatcher(repository, List.of(handler, otherHandler), manager,
                true, null, Runnable::run, null);

        try (var workers = Executors.newFixedThreadPool(2)) {
            var firstExecution = workers.submit(dispatcher::dispatchOne);
            try {
                assertThat(claimCommitEntered.await(5, TimeUnit.SECONDS)).isTrue();
                var secondStarted = new CountDownLatch(1);
                var secondExecution = workers.submit(() -> {
                    secondStarted.countDown();
                    return dispatcher.dispatchOne();
                });
                assertThat(secondStarted.await(5, TimeUnit.SECONDS)).isTrue();
                // A second worker cannot inspect capacity before the first claim's commit and reservation.
                assertThatThrownBy(() -> secondExecution.get(100, TimeUnit.MILLISECONDS))
                        .isInstanceOf(TimeoutException.class);
                verify(repository, times(1)).claimNext(any(), anyCollection());
                releaseClaimCommit.countDown();
                assertThat(deliveryEntered.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(secondExecution.get(5, TimeUnit.SECONDS)).isTrue();
                assertThat(eligibleClaims.get(1)).containsExactly("OTHER");
                assertThat(other.getPrcsSttsNm()).isEqualTo("SUCCEEDED");
                assertThat(following.getPrcsSttsNm()).isEqualTo("PENDING");
                verify(handler, never()).execute(followingWork);
            } finally {
                releaseClaimCommit.countDown();
                releaseDelivery.countDown();
            }
            assertThat(firstExecution.get(5, TimeUnit.SECONDS)).isTrue();
        }
        assertThat(first.getPrcsSttsNm()).isEqualTo("RETRY");
        assertThat(dispatcher.dispatchOne()).isTrue();
        verify(handler).execute(followingWork);
        assertThat(following.getPrcsSttsNm()).isEqualTo("SUCCEEDED");
    }

    @Test
    void acknowledgementFailureReturnsCapacityForTheNextClaim() {
        DurableJob first = job(work, 1);
        DurableWork followingWork = new DurableWork(UUID.randomUUID(), work.type(), "following");
        DurableJob following = job(followingWork, 2);
        when(repository.claimNext(any(), anyCollection())).thenReturn(Optional.of(first)).thenReturn(Optional.of(following));
        when(repository.findLocked(BigInteger.ONE)).thenThrow(new IllegalStateException("acknowledgement unavailable"));
        when(repository.findLocked(BigInteger.TWO)).thenReturn(Optional.of(following));
        var dispatcher = dispatcher(Runnable::run);

        assertThatThrownBy(dispatcher::dispatchOne).isInstanceOf(IllegalStateException.class);
        assertThat(dispatcher.dispatchOne()).isTrue();

        verify(handler).execute(followingWork);
        assertThat(following.getPrcsSttsNm()).isEqualTo("SUCCEEDED");
    }

    @Test
    void emptyAndExhaustedClaimsDoNotConsumeExecutionCapacity() {
        DurableJob exhausted = job(work, 1);
        ReflectionTestUtils.setField(exhausted, "rtryNmtm", BigInteger.valueOf(8));
        DurableWork followingWork = new DurableWork(UUID.randomUUID(), work.type(), "following");
        DurableJob following = job(followingWork, 2);
        when(repository.claimNext(any(), anyCollection()))
                .thenReturn(Optional.empty()).thenReturn(Optional.of(exhausted)).thenReturn(Optional.of(following));
        when(repository.findLocked(BigInteger.TWO)).thenReturn(Optional.of(following));
        var dispatcher = dispatcher(Runnable::run);

        assertThat(dispatcher.dispatchOne()).isFalse();
        assertThat(dispatcher.dispatchOne()).isTrue();
        assertThat(dispatcher.dispatchOne()).isTrue();

        verify(handler, never()).execute(work);
        verify(handler).onTerminal(work, false);
        verify(handler).execute(followingWork);
        assertThat(exhausted.getPrcsSttsNm()).isEqualTo("FAILED");
        assertThat(following.getPrcsSttsNm()).isEqualTo("SUCCEEDED");
    }

    private DurableJob readyJob() {
        DurableJob job = job(work, 1);
        when(repository.claimNext(any(), anyCollection())).thenReturn(Optional.of(job));
        when(repository.findLocked(BigInteger.ONE)).thenReturn(Optional.of(job));
        return job;
    }

    private DurableJob job(DurableWork intent, long id) {
        DurableJob job = DurableJob.pending(intent, LocalDateTime.now());
        ReflectionTestUtils.setField(job, "jobSn", BigInteger.valueOf(id));
        return job;
    }

    private DurableWorkDispatcher dispatcher(Executor workers) {
        return new DurableWorkDispatcher(repository, List.of(handler), manager, true, null, workers, scheduler);
    }
}
