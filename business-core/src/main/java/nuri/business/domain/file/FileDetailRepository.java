package nuri.business.domain.file;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 파일 상세 JPA Repository
 */
@Repository
public interface FileDetailRepository extends JpaRepository<FileDetail, java.util.UUID> {
    List<FileDetail> findByFileMaster(FileMaster fileMaster);

    org.springframework.data.domain.Page<FileDetail> findByOrgnlFileNmContaining(String orgnlFileNm,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT fd FROM FileDetail fd WHERE fd.fileMaster.atchFileSn = :atchFileSn AND fd.atchFileSeq = :atchFileSeq")
    java.util.Optional<FileDetail> findByFileMasterAtchFileSnAndAtchFileSeq(
            @org.springframework.data.repository.query.Param("atchFileSn") Long atchFileSn,
            @org.springframework.data.repository.query.Param("atchFileSeq") Integer atchFileSeq);
    /**
     * 첨부 마스터 번호로 <b>저장 위치만</b> 모아 읽는다 — 고아 census 의 역방향 대조용이다.
     *
     * <p>엔티티가 아니라 투영을 읽는 이유: 행마다 {@code fileCn}(varchar 4000)이 딸려 오면
     * 점검이 서비스 메모리를 압박한다. 같은 클래스의 정방향 스캔이 페이징으로 피한 것과 같은 축이다.
     *
     * <p><b>왜 경로가 아니라 {@code atchFileSn} 으로 조회하는가</b> — {@code (file_strg_path,
     * strg_file_nm)} 에는 인덱스가 없어(V2_0·V2_38·V2_72 실측) 경로 역조회는 풀스캔이 된다.
     * 반면 {@code atch_file_sn} 은 {@code uk_tb_file_detail_sn} 의 선두 컬럼이라 인덱스가 있다.
     * 대신 호출부가 <b>돌려받은 행의 경로가 실제로 그 디렉터리인지</b> 다시 확인해야 한다.
     */
    @org.springframework.data.jpa.repository.Query(
            "SELECT new nuri.business.service.file.dto.StoredFileKey("
                    + "fd.fileMaster.atchFileSn, fd.fileStrgPath, fd.strgFileNm) "
                    + "FROM FileDetail fd WHERE fd.fileMaster.atchFileSn IN :atchFileSns")
    List<nuri.business.service.file.dto.StoredFileKey> findStoredKeysByAtchFileSnIn(
            @org.springframework.data.repository.query.Param("atchFileSns") java.util.Collection<Long> atchFileSns);
}
