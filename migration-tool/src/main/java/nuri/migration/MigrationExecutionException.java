package nuri.migration;

/**
 * CLI 이관이 성공 증거를 만들지 못했음을 나타내는 치명 오류.
 *
 * <p>{@link org.springframework.boot.ApplicationRunner} 밖으로 전파되어 프로세스를 non-zero로 끝낸다.
 * 운영 자동화는 로그 문자열이 아니라 이 종료 상태를 실패 신호로 사용할 수 있다.
 */
public class MigrationExecutionException extends RuntimeException {

    public MigrationExecutionException(String message) {
        super(message);
    }

    public MigrationExecutionException(String message, Throwable cause) {
        super(message, cause);
    }
}
