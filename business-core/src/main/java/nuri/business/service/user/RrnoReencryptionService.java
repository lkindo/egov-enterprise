package nuri.business.service.user;

import java.sql.PreparedStatement;
import java.util.List;

import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.common.RrnoEncryptionConverter;
import nuri.business.domain.common.RrnoKeyring;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * 저장된 주민등록번호를 지금 활성 키의 v2 키링 암호문으로 다시 쓴다(2026-11-25, 품질 평가 개선 과제 3).
 *
 * <p>대상은 활성 키로 쓴 v2 봉투가 <b>아닌</b> 모든 값이다 — 종전 ARIA 암호문(IV·MAC 없는 결정적 암호라 같은 번호가 같은 암호문이 되고
 * 변조를 알 수 없다), 과거 평문, 이전 키의 v2 봉투(키 교체). 값은 {@link RrnoEncryptionConverter} 가 읽는 규칙 그대로 풀고
 * {@link RrnoKeyring#encrypt} 로 다시 암호화한다. 풀 수 없는 값을 만나면 그 자리에서 멈춘다(fail-closed) — 손상된 값을 덮어쓰지 않는다.
 *
 * <p>동시성: 읽은 암호문이 그대로일 때만 바꾸는 조건부 UPDATE 다. 그 사이 앱이 그 행을 고쳤으면 건너뛰고 센다(다음 실행이 다시 본다).
 * 행마다 자동 커밋이라 중간에 멈춰도 다시 돌리면 남은 행부터 잇는다(이미 활성 키인 값은 건너뛴다). 페이징은 키셋({@code esntl_id >})
 * 과 {@link PreparedStatement#setMaxRows} 라 벤더 고유 구문이 없다(ADR-0047).
 *
 * <p>로그·예외에는 건수와 행 식별자만 남기고 값(암호문·평문)은 남기지 않는다.
 */
@Slf4j
@Service
public class RrnoReencryptionService {

    static final int CHUNK = 200;

    private static final String SELECT_PAGE =
            "SELECT esntl_id, user_enrrno FROM tb_user_info WHERE esntl_id > ? AND user_enrrno IS NOT NULL ORDER BY esntl_id";
    private static final String UPDATE_IF_UNCHANGED =
            "UPDATE tb_user_info SET user_enrrno = ? WHERE esntl_id = ? AND user_enrrno = ?";

    private final JdbcTemplate jdbcTemplate;
    private final RrnoEncryptionConverter converter = new RrnoEncryptionConverter();

    public RrnoReencryptionService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * @param targets      활성 키가 아닌 값의 수(빈 값은 세지 않는다)
     * @param rewritten    다시 쓴 행 수(apply 일 때만)
     * @param changedMeanwhile 읽은 뒤 다른 쓰기가 먼저 바꿔 건너뛴 행 수
     */
    public record Result(long targets, long rewritten, long changedMeanwhile, boolean applied) {
    }

    /**
     * @param apply false 면 대상 수만 센다(dry-run). true 면 다시 쓴다.
     * @throws IllegalStateException 키링이 없거나, 풀 수 없는 값을 만났을 때
     */
    public Result run(boolean apply) {
        if (!RrnoKeyring.active()) {
            throw new IllegalStateException("Rrno keyring is not configured — set RRNO_ACTIVE_KEY_ID and RRNO_KEYS_JSON before re-encryption");
        }
        long targets = 0;
        long rewritten = 0;
        long changedMeanwhile = 0;
        String after = "";
        while (true) {
            List<StoredValue> page = page(after);
            if (page.isEmpty()) {
                break;
            }
            for (StoredValue stored : page) {
                if (stored.value().isBlank() || RrnoKeyring.isActiveKeyEnvelope(stored.value())) {
                    continue;
                }
                targets++;
                if (!apply) {
                    continue;
                }
                String plaintext;
                try {
                    plaintext = converter.convertToEntityAttribute(stored.value());
                } catch (RuntimeException undecipherable) {
                    throw new IllegalStateException("Rrno re-encryption stopped: stored value cannot be read (esntl_id="
                            + stored.esntlId() + "). Fix the key ring or the row before re-running.");
                }
                int updated = jdbcTemplate.update(UPDATE_IF_UNCHANGED, RrnoKeyring.encrypt(plaintext), stored.esntlId(),
                        stored.value());
                if (updated == 1) {
                    rewritten++;
                } else {
                    changedMeanwhile++;
                }
            }
            after = page.getLast().esntlId();
        }
        log.info("[RRNO] 재암호화 {} — 대상 {}건, 다시 씀 {}건, 그 사이 바뀌어 건너뜀 {}건", apply ? "적용" : "점검(dry-run)",
                targets, rewritten, changedMeanwhile);
        return new Result(targets, rewritten, changedMeanwhile, apply);
    }

    private List<StoredValue> page(String after) {
        return jdbcTemplate.query(connection -> {
            PreparedStatement statement = connection.prepareStatement(SELECT_PAGE);
            statement.setString(1, after);
            statement.setMaxRows(CHUNK);
            return statement;
        }, (rs, rowNum) -> new StoredValue(rs.getString(1), rs.getString(2)));
    }

    private record StoredValue(String esntlId, String value) {
    }
}
