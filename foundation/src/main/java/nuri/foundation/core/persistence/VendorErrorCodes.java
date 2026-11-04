package nuri.foundation.core.persistence;

import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 벤더 오류 번호로 가르는 응답 분류(ADR-0047, 설계서 §5 오류 분류).
 *
 * <p>SQLState 만으로는 같은 응답을 낼 수 없는 벤더가 있다. Oracle 은 무결성 위반이 모두 23000 이고, MySQL·MariaDB 는 CHECK·잠금
 * 대기 초과가 HY000 이라 JdbcTemplate 이 분류하지 못한다. 번호의 뜻은 벤더마다 다르다 — Oracle 의 1400(NOT NULL)은 MySQL·MariaDB
 * 에서 XA 오류이고 1722 는 바이너리 로그 경고다. 그래서 처리기는 활성 벤더의 표만 쓴다.
 *
 * @param invalidValues        입력 오류(400): CHECK·NOT NULL·길이·형식
 * @param duplicates           SQLState 가 무결성 계열이 아니어도 409 로 두는 중복·FK 위반
 * @param lockFailures         대기 초과·교착·직렬화 실패(409)
 * @param cancelled            문장 취소·시간 초과(503)
 * @param serverFaults         SQLState 가 입력 오류 계열이어도 500 으로 두는 서버 계산 오류. 드라이버가 SQLState 를 바꿔 올리는 벤더만 채운다
 * @param invalidValueMessages 번호 하나가 입력 오류와 다른 위반을 함께 쓰는 벤더의 입력 오류 판정. 메시지가 패턴에 맞을 때만 400 이다.
 *                             SQL Server 는 CHECK 와 FK 위반이 같은 547 이다
 */
public record VendorErrorCodes(Set<Integer> invalidValues, Set<Integer> duplicates, Set<Integer> lockFailures,
        Set<Integer> cancelled, Set<Integer> serverFaults, Map<Integer, Pattern> invalidValueMessages) {

    /** SQLState 로만 가르는 벤더의 표. PostgreSQL 드라이버는 오류 번호를 싣지 않는다. */
    public static final VendorErrorCodes NONE = new VendorErrorCodes(Set.of(), Set.of(), Set.of(), Set.of(), Set.of());

    public VendorErrorCodes {
        invalidValues = Set.copyOf(invalidValues);
        duplicates = Set.copyOf(duplicates);
        lockFailures = Set.copyOf(lockFailures);
        cancelled = Set.copyOf(cancelled);
        serverFaults = Set.copyOf(serverFaults);
        invalidValueMessages = Map.copyOf(invalidValueMessages);
        if (invalidValueMessages.keySet().stream().anyMatch(invalidValues::contains)) {
            throw new IllegalArgumentException("메시지로 가르는 번호는 번호만으로 입력 오류인 표에 둘 수 없다");
        }
    }

    /** 번호만으로 가르는 벤더의 표. */
    public VendorErrorCodes(Set<Integer> invalidValues, Set<Integer> duplicates, Set<Integer> lockFailures,
            Set<Integer> cancelled, Set<Integer> serverFaults) {
        this(invalidValues, duplicates, lockFailures, cancelled, serverFaults, Map.of());
    }

    /** 이 오류가 입력 오류(400)인가. 메시지 판정은 그 번호에만 쓴다. */
    public boolean rejectsValue(int code, String message) {
        if (invalidValues.contains(code)) {
            return true;
        }
        Pattern pattern = invalidValueMessages.get(code);
        return pattern != null && message != null && pattern.matcher(message).find();
    }
}
