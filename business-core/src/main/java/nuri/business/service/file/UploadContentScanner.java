package nuri.business.service.file;

import java.io.IOException;

import org.springframework.web.multipart.MultipartFile;

/**
 * 업로드 내용 검사(악성코드 검사) 연동 지점(2026-11-25, 품질 평가 개선 과제 16).
 *
 * <p>확장자 허용 목록과 파일 머리 대조({@code FileService})는 형식 위장을 막는 1차 방어일 뿐 안티바이러스가 아니다. 기관이 백신·샌드박스
 * (예: ClamAV clamd, 상용 게이트웨이)를 쓰면 이 포트를 구현한 빈 하나를 등록한다 — 등록이 없으면 {@link #ALLOW_ALL} 이 쓰인다.
 * 압축·오피스 파일 내부 검사도 구현의 몫이다.
 *
 * <p>계약: 저장 전에, 형식 검사를 통과한 파일마다 한 번 부른다. {@code false} 를 돌려주거나 예외를 던지면 그 요청의 업로드 전체를 거부한다
 * (fail-closed — 검사기가 응답하지 않을 때 통과시키지 않는다). 구현은 {@link MultipartFile#getInputStream()} 으로 내용을 읽고, 파일명·내용을
 * 로그에 남기지 않는다.
 */
@FunctionalInterface
public interface UploadContentScanner {

    /** 검사기를 연동하지 않은 기본값 — 형식 검사만 적용된다. */
    UploadContentScanner ALLOW_ALL = (file, extension) -> true;

    /**
     * @param file      형식 검사를 통과한 업로드 파일
     * @param extension 소문자 확장자
     * @return 저장해도 되면 true
     */
    boolean isClean(MultipartFile file, String extension) throws IOException;
}
