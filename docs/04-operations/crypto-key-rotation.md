# 암호화 마스터 키 로테이션 & PII 재암호화 런북

> ARIA 마스터 암호화 키(`Globals.File.algorithmKey`)를 안전하게 교체하는 절차. 이 키는 `CryptoUtil` →
> `RrnoEncryptionConverter`를 통해 **주민등록번호(rrno, `tb_user_info.rrno`)** 등 PII 암복호화에 사용된다.
> (E2E/foundation 감사 C1 후속)

## 0. 배경 & 현재 상태
- **문제(C1)**: 기본 키가 eGovFrame 공개 샘플값 `egovframe`(저엔트로피)이며 소스에 커밋돼 있었다. 저장소/백업 유출 시 PII 전량 복호화 위험.
- **적용된 보호**: 키를 `${ALGORITHM_KEY:egovframe}`로 **env 외부화**, 약한 기본키 경고, 키 원문 로깅 제거, 쓰기 암호화 실패 **fail-closed**. 2026-08-15부터 `OLD_ALGORITHM_KEY`가 있으면 활성 키 실패 후 구키로 한 번만 복호화하며, 임의의 손상 문자열은 PII로 반환하지 않고 읽기도 fail-closed한다. 명확한 주민번호 형식의 과거 평문만 제한적으로 읽고 다음 쓰기에서 암호화한다.
- **PII 규모의 마지막 실측(2026-07-10)**: `tb_user_info` 20행 중 `rrno` 비어있지 않은 행 **0건**. 이 값은 운영 실행 직전에 반드시 아래 쿼리로 다시 측정해야 하며 현재값으로 간주하지 않는다.

```sql
SELECT count(*) AS rrno_rows
FROM tb_user_info
WHERE rrno IS NOT NULL AND btrim(rrno) <> '';
```

## 1. 강한 키 생성
```bash
openssl rand -base64 32      # 32바이트(=256bit) 랜덤 키, base64 44자
# 예) z5GR4UqYSaY9quEnO0o1kGkTkLlh7J8wi3jmRbhFl04=   ← 예시일 뿐, 반드시 새로 생성
```

## 2. 키 주입 (소스 커밋 금지)
운영은 아래 중 하나로 주입한다. **application.yml에 실제 키를 커밋하지 않는다.**
```bash
# 환경변수
export ALGORITHM_KEY='<위에서 생성한 키>'
# 회전 창에서만: export OLD_ALGORITHM_KEY='<현재 사용 중인 구키>'
# 또는 systemd/컨테이너 시크릿, HashiCorp Vault, OCI Vault/KMS 등
```
`application.yml`의 활성 키와 `globals.properties`의 이전 키 설정이 각각 `ALGORITHM_KEY`,
`OLD_ALGORITHM_KEY`를 읽는다. 운영 compose도 두 변수를 컨테이너로 전달한다.

## 3. PII가 없을 때(현재) — 단순 로테이션
`rrno` 데이터가 0건이면 재암호화가 불필요하므로:
1. DB 백업(관례상).
2. `ALGORITHM_KEY`에 새 키 설정 후 애플리케이션 재기동(`OLD_ALGORITHM_KEY`는 비움).
3. `CryptoUtil` 경고 로그가 사라졌는지 확인(약한 기본키 미사용).
> 이후 입력되는 rrno는 새 키로 암호화된다. 기존 암호문이 없으므로 복호화 실패 위험 없음.

## 4. PII가 존재할 때 — 무손실 재암호화 절차 (Dual-Key)
키를 그냥 바꾸면 **기존 암호문이 새 키로 복호화되지 않아 PII가 유실**된다. 다음 순서를 따른다.

### 4.1 백업 (필수, 되돌리기 지점)
```bash
pg_dump "postgresql://egov:***@<host>:5432/egovdb" -t tb_user_info > backup_tb_user_info_$(date +%F).sql
```

### 4.2 재암호화 실행 (OLD→NEW, dry-run 우선)
먼저 애플리케이션에 `ALGORITHM_KEY=<신규>`, `OLD_ALGORITHM_KEY=<기존>`을 함께 주입해 재기동한다.
신규 쓰기는 활성 키를 사용하고, 기존 암호문 읽기는 활성 키 실패 후 구키로 폴백한다. 이 이중 읽기
상태에서 각 `rrno`를 `CryptoUtil.decrypt`→`CryptoUtil.encrypt`로 치환한다.

- **dry-run**: 대상 행 수·복호화 성공률만 보고(쓰기 없음).
- **commit**: 트랜잭션·배치로 UPDATE. 실패 행은 스킵·리포트(중단하지 않되 집계).
- **검증**: 마이그레이션 후 신규 키로 전 행 복호화가 성공하는지 재확인.

권장 러너 설계(테스트 프로필/속성으로 게이트, 기본 비활성):
```
@Component
@ConditionalOnProperty(name = "crypto.reencrypt.enabled", havingValue = "true")
class RrnoReencryptRunner implements ApplicationRunner {
  // 프로퍼티: crypto.reencrypt.dryRun(default true), batchSize
  // 1) ALGORITHM_KEY=신규, OLD_ALGORITHM_KEY=기존으로 기동(CryptoUtil이 dual-read 제공)
  // 2) SELECT esntl_id, rrno FROM tb_user_info WHERE rrno IS NOT NULL AND rrno <> ''
  // 3) plain = decryptWithOld(rrno);  newCipher = CryptoUtil.encrypt(plain)   // 현재 활성 키=신규
  // 4) dryRun이면 카운트만, 아니면 UPDATE tb_user_info SET rrno=? WHERE esntl_id=? (배치)
  // 5) 실패(복호화 안 됨) 행은 스킵·집계 후 리포트
}
```
> 러너는 마지막 실측에서 대상 0건이라 본 저장소에 상시 탑재하지 않는다. 실행 직전 census가 0이면
> 이 절 전체가 no-op이고, 1건 이상이면 백업·dry-run·행 수 대조를 포함한 1회성 러너를 별도 검증한 뒤 사용한다.

### 4.3 키 전환 & 정리
1. 신규 키만으로 전 행 복호화 성공을 검증한다.
2. `ALGORITHM_KEY`를 신규 키로 유지한 채 `OLD_ALGORITHM_KEY`를 제거하고 재기동한다.
3. 시크릿 저장소의 구키를 폐기한다.
4. 로그·모니터링에서 복호화 실패(`Rrno decryption failed`)가 없는지 확인한다.

### 4.4 롤백
문제 시 4.1 백업으로 `tb_user_info` 복원 후 이전 키로 재기동.

## 5. 체크리스트
- [ ] 실행 직전 `rrno` 대상 행 수 재측정
- [ ] 새 키 생성(32B) 및 시크릿 저장소 주입(커밋 금지)
- [ ] (PII 존재 시) 백업 → dry-run → 재암호화 → 검증
- [ ] 앱 재기동 후 `CryptoUtil` 약한키 경고 없음 확인
- [ ] 복호화 실패 로그 0건 확인

---
*Last Updated: 2026-08-15 (구키 dual-read, 손상 암호문 read fail-closed, 운영 compose 주입 경로 반영)*
