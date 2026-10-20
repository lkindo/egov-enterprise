package nuri.business.service.stats;

import lombok.RequiredArgsConstructor;
import nuri.business.service.stats.dto.StatsPoint;
import nuri.business.service.stats.dto.UserActivityStats;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.stats.DataUsageStatisticsContributor;
import nuri.foundation.core.stats.PostStatisticsContributor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.NavigableMap;
import java.util.Objects;
import java.util.TreeMap;

/**
 * 보고서 통계 정보 및 데이터 사용현황 관리를 위한 서비스.
 * 타임스탬프 조회는 시작일 0시 이상, 종료일 다음날 0시 미만으로 마지막 소수초까지 포함한다.
 *
 * <p>[2026-09-25] 조회 기간 해석을 {@link #range(String, String)} 한 곳에 모은다. 종전에는 호출부마다 날짜를
 * 바로 {@code LocalDate.parse} 해, 형식이 틀리면 {@code DateTimeParseException} 이 500 으로 끝났다(주간 API
 * 스캔이 퍼징하는 파라미터다). 이제 형식 오류와 시작일이 종료일보다 늦은 기간은 400 이다. 컨트롤러가 부르지 않던
 * 목록·건수·유형·상태·게시판별 조회 7개와 그 전용 쿼리(없는 컬럼을 가리키던 쿼리 포함)는 걷었다.
 *
 * <p>[2026-10-19] 보고서 통계(날짜별 조회·등록)를 걷었다. 등록은 자기 단위 시험만 불러 제품 경로에서 한 번도 실행되지
 * 않았고, 그래서 조회 탭은 어떤 기간에도 비어 있었다. 물리 테이블 tb_rptp_stats 는 남긴다(V2_134 는 메뉴만 걷는다).
 *
 * <p>[2026-10-20] 시계열 응답을 한 모양으로 모은다. 종전에는 계열마다 날짜 형식(접속 {@code yyyy-MM-dd} · 사용자
 * {@code yyyyMMdd} · 게시물 {@code yyyy-MM-dd} 최신순)과 순서가 달라 화면이 정렬해 그렸고, 기간의 빈 날은 점이 없어
 * 차트가 기록이 있는 날끼리 이어 그렸다. 이제 이 서비스가 한 곳에서 정한다.
 * <ul>
 *   <li>모든 계열은 {@link StatsPoint}({@code yyyy-MM-dd}, 건수)의 날짜 오름차순 목록이다.</li>
 *   <li><b>측정하는 계열</b>(성공 로그인·사용자 활동·게시글 — 쓰는 쪽이 있다)은 기간 안의 날마다 한 칸이고 기록이 없는 날은
 *       0 이다. 오늘(Asia/Seoul) 뒤의 날은 아직 오지 않아 싣지 않는다.</li>
 *   <li><b>쓰는 쪽이 없는 계열</b>(자료 이용)은 빈 날을 채우지 않는다 — 측정하지 않는 값을 0 으로 지어내지 않는다(DEC-OPS-100).</li>
 *   <li>기간을 비우면 오늘까지 최근 1개월이다. 한 번에 {@value #MAX_PERIOD_DAYS}일(시작·종료일 포함)까지 묻고, 넘으면 400 이다.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportStatsService {

    /** 한 번에 조회할 수 있는 기간의 상한(시작일·종료일 포함 일수). 윤년 한 해를 담는다. */
    public static final int MAX_PERIOD_DAYS = 366;

    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    private final nuri.business.domain.log.UserLogRepository userLogRepository;
    private final nuri.business.domain.log.LoginLogRepository loginLogRepository;
    private final nuri.business.domain.user.repository.UserRepository userRepository;

    /**
     * 게시글 집계를 세는 포트. 게시판 도메인이 구현하며 여기서는 숫자만 받는다.
     *
     * <p>종전에는 {@code BoardRepository} 를 인라인 FQN 으로 주입해 stats→board 교차 도메인 결합을
     * 만들었다(GAP-ARCH-001). {@code ObjectProvider} 로 받는 것은 게시판 도메인이 base projection 에서
     * 빠진 프로필에서도 통계가 뜨게 하기 위해서다 — 그때의 0 은 셀 게시글이 없다는 사실이다.
     */
    private final ObjectProvider<PostStatisticsContributor> postStatistics;

    /**
     * 자료 이용 집계를 세는 포트. 게시판 도메인이 구현한다({@code tb_dta_use_stats} 는 게시판 데이터다).
     *
     * <p>종전에는 그 Repository 를 직접 주입해, 게시판이 빠진 구성에서 통계까지 함께 빠졌다. 게시글 포트와 같은 이유로
     * {@code ObjectProvider} 로 받으며, 구현이 없을 때의 빈 목록은 셀 기록이 없다는 사실이다.
     */
    private final ObjectProvider<DataUsageStatisticsContributor> dataUsageStatistics;

    /**
     * '오늘' 의 기준 시계 — 기본 기간, 아직 오지 않은 날, 오늘 성공 로그인. 운영에서는 항상 Asia/Seoul 시스템 시계다.
     *
     * <p>종전에는 {@code LocalDate.now()}(JVM 시간대)였다. 운영 JVM 은 Asia/Seoul 이지만 시험 JVM 은 UTC 라 KST 자정~09시에
     * 하루가 갈렸다. 생성자 주입으로 바꾸면 빈 구성과 기존 생성 경로가 흔들리므로 기본값을 둔 필드와 같은 패키지 전용 교체
     * 지점만 연다({@code LoginPolicyManageService} 와 같은 방식).
     */
    private Clock clock = Clock.system(SERVICE_ZONE);

    /** 시험 전용 — '오늘' 을 고정한다. */
    void useClock(Clock clock) {
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    // ========== 사용자 통계 ==========

    /**
     * 날짜별 사용자 활동 — 조회·등록·수정·삭제 요청 수 네 계열. 같은 날짜 축이고 기록이 없는 날은 0 이다.
     */
    public UserActivityStats getUserStatsByDate(String fromDate, String toDate) {
        DateRange range = range(fromDate, toDate);
        // TB_USER_LOG 에서 날짜별로 집계한다. 열 순서는 UserLogRepository#countByDate 의 SELECT 순서다.
        List<Object[]> rows = userLogRepository.countByDate(range.fromYmd(), range.toYmd());
        return new UserActivityStats(
                range.measured(rows, 1),
                range.measured(rows, 2),
                range.measured(rows, 3),
                range.measured(rows, 4));
    }

    /**
     * 날짜별 성공 로그인 통계. 기록이 없는 날은 0 이다.
     */
    public List<StatsPoint> getConnectStatsByDate(String fromDate, String toDate) {
        DateRange range = range(fromDate, toDate);
        // TB_LOGIN_LOG 에서 날짜별로 집계
        return range.measured(loginLogRepository.countLoginsByDate(range.fromYmd(), range.toYmd()), 1);
    }

    /**
     * 통계 요약(총 사용자/총 게시글/오늘 성공 로그인) — 대시보드 상단 요약 카드용.
     * 프런트 StatsAdminService.getSummary()가 호출하는 GET /api/v1/admin/system/statistics/summary 백엔드.
     */
    public nuri.business.service.stats.dto.SummaryStatsDto getSummary() {
        long totalUsers = userRepository.count();
        PostStatisticsContributor posts = postStatistics.getIfAvailable();
        long totalPosts = posts == null ? 0L : posts.countPosts();
        String today = LocalDate.now(clock).format(DateTimeFormatter.BASIC_ISO_DATE);
        long todayConnects = loginLogRepository.countLoginsByDate(today, today).stream()
                .filter(row -> row.length > 1 && row[1] != null)
                .mapToLong(row -> ((Number) row[1]).longValue())
                .sum();
        return nuri.business.service.stats.dto.SummaryStatsDto.builder()
                .totalUsers(totalUsers)
                .totalPosts(totalPosts)
                .todayConnects(todayConnects)
                .build();
    }

    // ========== 데이터 사용현황 ==========

    /**
     * 날짜별 자료 이용 건수. 기록이 있는 날만 싣는다.
     *
     * <p>빈 날을 0 으로 채우지 않는 것은 의도다 — 자료 이용 기록({@code tb_dta_use_stats})에는 제품 코드가 쓰는 경로가 없어
     * (writer 0) 어떤 날도 측정되지 않는다. 0 을 채우면 측정하지 않은 값을 0 건으로 말한다(DEC-OPS-100). 화면은 이 계열을
     * 미수집으로 고지한다(게시판 기여의 uninstrumented). 쓰는 쪽이 생기면 그때 측정하는 계열로 옮긴다.
     */
    public List<StatsPoint> getDtaUseStatsByDate(String fromDate, String toDate) {
        DateRange range = range(fromDate, toDate);
        DataUsageStatisticsContributor usage = dataUsageStatistics.getIfAvailable();
        return usage == null ? List.of() : range.recorded(usage.countDataUsageByDate(range.fromTimestamp(), range.toExclusiveTimestamp()));
    }

    /**
     * 날짜별 게시판 활동 통계. 기록이 없는 날은 0 이다.
     *
     * <p>[2026-08-28] 종전에는 자료 이용 Repository 의 {@code countByDate} 를 불렀다 —
     * 바로 위 {@link #getDtaUseStatsByDate} 와 <b>완전히 같은 질의</b>다. 즉 게시물 통계 화면은
     * 게시글을 하나도 세지 않고 자료이용현황과 같은 숫자를 보여 주고 있었고,
     * {@code tb_dta_use_stats} 에는 쓰는 코드가 없어(writer 0건) 실제로는 늘 비어 있었다.
     *
     * <p>이제 게시글({@code tb_bbs_item})을 실제로 센다. 논리 삭제된 글은 제외한다. 게시판이 빠진 구성에는 셀 게시글의
     * 원천이 없어 빈 목록이다(날을 채우지 않는다).
     */
    public List<StatsPoint> getBbsStatsByDate(String fromDate, String toDate) {
        DateRange range = range(fromDate, toDate);
        PostStatisticsContributor posts = postStatistics.getIfAvailable();
        return posts == null ? List.of() : range.measured(posts.countPostsByDate(range.fromTimestamp(), range.toExclusiveTimestamp()), 1);
    }

    /**
     * 검증을 마친 조회 기간. 종료일은 그날을 포함한다. {@code today} 는 기간을 해석한 순간의 오늘(Asia/Seoul)이다.
     */
    private record DateRange(LocalDate from, LocalDate to, LocalDate today) {
        String fromYmd() {
            return from.format(DateTimeFormatter.BASIC_ISO_DATE);
        }

        String toYmd() {
            return to.format(DateTimeFormatter.BASIC_ISO_DATE);
        }

        String fromTimestamp() {
            return from + " 00:00:00";
        }

        /** 종료일 다음날 0시 — 배타적 상한이라 마지막 소수초까지 포함한다. */
        String toExclusiveTimestamp() {
            return to.plusDays(1) + " 00:00:00";
        }

        /**
         * 측정하는 계열 — 기간 첫날부터 날마다 한 칸, 기록이 없는 날은 0.
         *
         * <p>마지막 칸은 종료일과 오늘 가운데 이른 날이다 — 아직 오지 않은 날의 0 은 측정값이 아니다. 다만 그 뒤에 기록이 있으면
         * (DB 와 앱의 시계가 어긋난 경우) 기록을 버리지 않고 그날까지 싣는다.
         */
        List<StatsPoint> measured(List<Object[]> rows, int valueColumn) {
            NavigableMap<LocalDate, Long> byDate = byDate(rows, valueColumn);
            LocalDate last = to.isAfter(today) ? today : to;
            if (!byDate.isEmpty() && byDate.lastKey().isAfter(last)) {
                last = byDate.lastKey();
            }
            List<StatsPoint> points = new ArrayList<>();
            for (LocalDate day = from; !day.isAfter(last); day = day.plusDays(1)) {
                points.add(new StatsPoint(day.toString(), byDate.getOrDefault(day, 0L)));
            }
            return List.copyOf(points);
        }

        /** 기록만 싣는 계열 — 날짜 오름차순, 빈 날을 채우지 않는다. */
        List<StatsPoint> recorded(List<Object[]> rows) {
            return byDate(rows, 1).entrySet().stream()
                    .map(entry -> new StatsPoint(entry.getKey().toString(), entry.getValue()))
                    .toList();
        }

        /**
         * 저장소 행({@code [날짜 문자열, 건수…]})을 날짜별 합으로 모은다. 날짜는 저장소마다 형식이 달라({@code yyyy-MM-dd}·
         * {@code yyyyMMdd}) 여기서 한 형식으로 읽는다. 기간 밖의 행은 버린다. 건수가 NULL 이면(카운터 컬럼은 nullable 이다)
         * 그 행의 기여는 0 이다 — 행이 있다는 것은 그날을 쟀다는 뜻이다.
         */
        private NavigableMap<LocalDate, Long> byDate(List<Object[]> rows, int valueColumn) {
            NavigableMap<LocalDate, Long> sums = new TreeMap<>();
            for (Object[] row : rows) {
                LocalDate day = rowDate(row[0]);
                if (day.isBefore(from) || day.isAfter(to)) {
                    continue;
                }
                Object count = row.length > valueColumn ? row[valueColumn] : null;
                sums.merge(day, count == null ? 0L : ((Number) count).longValue(), Long::sum);
            }
            return sums;
        }

        private static LocalDate rowDate(Object value) {
            if (value instanceof String text) {
                try {
                    return LocalDate.parse(text, text.indexOf('-') >= 0
                            ? DateTimeFormatter.ISO_LOCAL_DATE : DateTimeFormatter.BASIC_ISO_DATE);
                } catch (DateTimeException e) {
                    throw new IllegalStateException("통계 집계 행의 날짜를 읽을 수 없습니다: " + text, e);
                }
            }
            throw new IllegalStateException("통계 집계 행의 날짜 형식을 알 수 없습니다: "
                    + (value == null ? "null" : value.getClass().getName()));
        }
    }

    /**
     * 화면의 ISO 날짜와 저장 형식 yyyyMMdd 를 같은 날짜 구간으로 정규화하고 검증한다.
     * 비우면 오늘(Asia/Seoul)까지 최근 1개월이다 — 한쪽만 비우면 그쪽만 그 기본값이다.
     * 형식이 틀리거나, 시작일이 종료일보다 늦거나, {@value #MAX_PERIOD_DAYS}일을 넘으면 400(INVALID_INPUT_VALUE)이다.
     */
    private DateRange range(String fromDate, String toDate) {
        LocalDate today = LocalDate.now(clock);
        LocalDate to = isBlank(toDate) ? today : parseDate(toDate, "toDate");
        LocalDate from = isBlank(fromDate) ? today.minusMonths(1) : parseDate(fromDate, "fromDate");
        if (from.isAfter(to)) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "조회 시작일이 종료일보다 늦습니다.");
        }
        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_PERIOD_DAYS) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                    "조회 기간은 " + MAX_PERIOD_DAYS + "일을 넘을 수 없습니다.");
        }
        return new DateRange(from, to, today);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static LocalDate parseDate(String value, String name) {
        try {
            return LocalDate.parse(value, value.indexOf('-') >= 0
                    ? DateTimeFormatter.ISO_LOCAL_DATE : DateTimeFormatter.BASIC_ISO_DATE);
        } catch (DateTimeException e) {
            throw invalidDate(name);
        }
    }

    private static BusinessException invalidDate(String name) {
        return new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                name + " 은 yyyy-MM-dd 또는 yyyyMMdd 형식의 날짜여야 합니다.");
    }
}
