package com.company.project.core.storage;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Path;
import java.util.stream.Stream;

/**
 * 파일 저장소 추상화 인터페이스
 */
public interface FileStorageService {

    /**
     * 저장소 초기화
     */
    void init();

    /**
     * 파일 저장 (경로 미지정 시 기본 경로)
     */
    String store(MultipartFile file);

    /**
     * 파일 저장
     *
     * @param file       멀티파트 파일
     * @param targetPath 저장할 상대 경로 (디렉토리)
     * @return 저장된 파일명 (서버측 저장명)
     */
    String store(MultipartFile file, String targetPath);

    /**
     * 파일 로드 (Path 객체)
     */
    Path load(String filename);

    /**
     * 파일 로드 (리소스, 경로 미지정 시 기본 경로)
     */
    Resource loadAsResource(String filename);

    /**
     * 파일 로드 (리소스)
     *
     * @param filename   저장된 파일명
     * @param targetPath 저장된 상대 경로
     * @return 리소스 객체
     */
    Resource loadAsResource(String filename, String targetPath);

    /**
     * 파일 삭제 (경로 미지정 시 기본 경로)
     */
    void delete(String filename);

    /**
     * 파일 삭제
     *
     * @param filename   저장된 파일명
     * @param targetPath 저장된 상대 경로
     */
    void delete(String filename, String targetPath);

    /**
     * 모든 파일 삭제
     */
    void deleteAll();

    /**
     * 모든 파일 목록 조회 (기본 경로)
     */
    Stream<Path> loadAll();

    /**
     * 모든 파일 목록 조회
     */
    Stream<Path> loadAll(String targetPath);
}
