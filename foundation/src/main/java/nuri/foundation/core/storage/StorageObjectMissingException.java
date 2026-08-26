package nuri.foundation.core.storage;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;

/**
 * DB 에는 첨부 레코드가 있는데 <b>저장소에 실물이 없을 때</b> 던진다.
 *
 * <p>[왜 별도 타입인가 — 2026-08-26 실측]
 * 종전에는 두 가지 실패가 <b>구분 없이</b> {@link CommonErrorCode#RESOURCE_NOT_FOUND} 였다.
 *
 * <ul>
 *   <li>첨부 레코드가 없다 — 삭제됐거나 잘못된 식별자. <b>정상적인 404</b> 다.</li>
 *   <li>레코드는 있는데 바이트가 없다 — DB 와 저장소가 <b>어긋난 상태</b>다. 운영이 알아야 할 사고다.</li>
 * </ul>
 *
 * <p>두 번째가 첫 번째처럼 보이면 <b>파일 유실을 아무도 모른다</b>. 실제로 이번에는 사용자가 화면의
 * 깨진 배너로 발견했지 시스템이 알려 주지 않았다. DB 와 파일 저장소를 분리 운영하는 것은 정상이지만,
 * 어긋났을 때 그것이 <b>드러나야</b> 분리가 안전해진다.
 *
 * <p>⚠ <b>응답은 종전과 같은 404 다</b>. 상태 코드나 본문으로 "레코드는 있는데 파일이 없다"를
 * 알려 주면 존재 여부가 새어 나간다(열거 공격). 구분은 <b>서버 관측</b>(로그·지표·진단)에만 쓴다.
 */
public class StorageObjectMissingException extends BusinessException {

    private final String storagePath;
    private final String storedFileName;

    public StorageObjectMissingException(String storagePath, String storedFileName) {
        super(CommonErrorCode.RESOURCE_NOT_FOUND);
        this.storagePath = storagePath;
        this.storedFileName = storedFileName;
    }

    /** 저장소 내 경로. 진단·복구 대상 식별에 쓴다. */
    public String getStoragePath() {
        return storagePath;
    }

    /** 저장 파일명(원본명이 아니다 — 원본명은 사용자 입력이라 로그에 남기지 않는다). */
    public String getStoredFileName() {
        return storedFileName;
    }
}
