package nuri.business.domain.program;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProgramRepository extends JpaRepository<Program, String> {

    /**
     * 메뉴 생성 중 참조할 프로그램을 원자적으로 준비한다.
     *
     * <p>메뉴 마법사 두 요청이 같은 {@code prgrmFileNm}을 최초 사용하면
     * {@code existsById -> save}는 둘 다 미존재를 관측한 뒤 같은 PK를 INSERT할 수 있다.
     * PostgreSQL의 PK 충돌 처리를 한 문장에 묶어, 먼저 들어온 프로그램 메타데이터를 유지하면서
     * 뒤 요청도 메뉴 생성 자체는 계속할 수 있게 한다.</p>
     *
     * @return 신규 삽입이면 1, 이미 존재하면 0
     */
    @Modifying
    @Query(value = """
            INSERT INTO tb_prgrm_lst (
                prgrm_file_nm, prgrm_korn_nm, url, prgrm_strg_path,
                crt_dt, mdfcn_dt, frst_rgtr_id, last_mdfr_id)
            VALUES (
                :prgrmFileNm, :prgrmKornNm, :url, :prgrmStrgPath,
                now(), now(), :auditActor, :auditActor)
            ON CONFLICT ON CONSTRAINT pk_tb_prgrm_lst DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(
            @Param("prgrmFileNm") String prgrmFileNm,
            @Param("prgrmKornNm") String prgrmKornNm,
            @Param("url") String url,
            @Param("prgrmStrgPath") String prgrmStrgPath,
            @Param("auditActor") String auditActor);

    @Query("SELECT p FROM Program p WHERE p.prgrmKornNm LIKE CONCAT(:searchKeyword, '%') OR p.prgrmFileNm LIKE CONCAT(:searchKeyword, '%')")
    Page<Program> searchByKeyword(@Param("searchKeyword") String searchKeyword, Pageable pageable);

    java.util.Optional<Program> findByUrl(String url);
}
