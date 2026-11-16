package nuri.migration.etl;

import nuri.migration.state.MigrationScratchIndex;

/**
 * keyset 적재 한 표의 source identity·order identity 중복 판정(2026-11-16).
 *
 * <p>종전에는 표마다 두 {@code HashSet<String>} 에 읽은 모든 행의 키를 담았다. 힙이 표의 행 수에 비례해 자라므로 수천만 행 표에서는
 * 메모리가 모자라 멈추고, 재개해도 같은 표를 처음부터 다시 담아 같은 지점에서 다시 멈췄다. 자기참조 예약({@code KeyMapRegistry
 * #reservationKeys})과 같은 실행 전용 암호화 디스크 색인으로 옮긴다 — 판정은 같은 정확한 일치이고, 힙에는 행 수만큼 남지 않는다.
 * 색인은 이 표의 읽기가 끝나면 지운다. 색인 장애는 이 표의 실패로 끝나지 않고 실행을 멈춘다(다른 임시 색인과 같다).
 */
final class KeysetSeenIdentities implements AutoCloseable {

    private static final String ADD_SOURCE_KEY = "INSERT INTO scratch_seen_source (k) SELECT ?"
            + " WHERE NOT EXISTS (SELECT 1 FROM scratch_seen_source WHERE k=?)";
    private static final String ADD_ORDER_DIGEST = "INSERT INTO scratch_seen_order (k) SELECT ?"
            + " WHERE NOT EXISTS (SELECT 1 FROM scratch_seen_order WHERE k=?)";

    private final MigrationScratchIndex index = new MigrationScratchIndex(
            "CREATE TABLE scratch_seen_source (k VARCHAR PRIMARY KEY)",
            "CREATE TABLE scratch_seen_order (k VARCHAR PRIMARY KEY)");

    /** @return 이 표에서 처음 본 source identity 면 true */
    boolean firstSourceKey(String sourceKey) {
        return index.access(jdbc -> jdbc.update(ADD_SOURCE_KEY, sourceKey, sourceKey)) == 1;
    }

    /** @return 이 표에서 처음 본 order identity 면 true */
    boolean firstOrderDigest(String orderDigest) {
        return index.access(jdbc -> jdbc.update(ADD_ORDER_DIGEST, orderDigest, orderDigest)) == 1;
    }

    @Override
    public void close() {
        index.close();
    }
}
