package nuri.business.service.file.dto;

/**
 * DB 가 기록한 저장 위치 한 건.
 *
 * <p>고아 census 의 대조 키다. 엔티티가 아니라 투영으로 읽는다 — {@code FileDetail} 을 통째로
 * 읽으면 행마다 {@code fileCn}(varchar 4000)까지 딸려 와 점검이 서비스 메모리를 압박한다.
 *
 * @param atchFileSn   첨부 마스터 번호
 * @param fileStrgPath DB 가 기록한 저장 경로(예: {@code general/12})
 * @param strgFileNm   저장 파일명(UUID + 확장자)
 */
public record StoredFileKey(Long atchFileSn, String fileStrgPath, String strgFileNm) {
}
