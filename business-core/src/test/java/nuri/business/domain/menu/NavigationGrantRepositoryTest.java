package nuri.business.domain.menu;

import java.util.List;
import java.util.UUID;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/** 실제 SQL을 실행해 유형 격리, 복수 그룹 합집합과 레거시 조회 계약을 검증한다. */
class NavigationGrantRepositoryTest {
    private JdbcTemplate jdbc;
    private NavigationGrantRepository repository;
    private MenuRepositoryImpl menuRepository;

    @BeforeEach
    void createQueryFixture() {
        JdbcDataSource source = new JdbcDataSource();
        source.setURL("jdbc:h2:mem:navigation_" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1");
        jdbc = new JdbcTemplate(source);
        var named = new NamedParameterJdbcTemplate(source);
        repository = new NavigationGrantRepository(named);
        menuRepository = new MenuRepositoryImpl(null, named);
        jdbc.execute("CREATE TABLE tb_authrt_info(authrt_cd varchar(20) PRIMARY KEY,authrt_nm varchar(100),"
                + "authrt_expln varchar(4000),authrt_crt_ymd varchar(8))");
        jdbc.execute("CREATE TABLE tb_menu_info(menu_sn bigint PRIMARY KEY,menu_nm varchar(100),up_menu_sn bigint,"
                + "menu_ordr integer,menu_expln varchar(4000),rel_img_path varchar(100),rel_img_nm varchar(100),"
                + "prgrm_file_nm varchar(100),use_yn varchar(1))");
        jdbc.execute("CREATE TABLE tb_prgrm_lst(prgrm_file_nm varchar(100) PRIMARY KEY,url varchar(100))");
        jdbc.execute("CREATE TABLE tb_authrt_user_map(scrty_dcsn_trgt_id varchar(20),authrt_cd varchar(20),"
                + "PRIMARY KEY(scrty_dcsn_trgt_id,authrt_cd))");
        jdbc.execute("CREATE TABLE tb_authrt_grnt_map(authrt_cd varchar(20),authrt_type_cd varchar(12),"
                + "authrt_grnt_cd varchar(20),PRIMARY KEY(authrt_cd,authrt_type_cd,authrt_grnt_cd))");
        jdbc.update("INSERT INTO tb_authrt_info(authrt_cd,authrt_nm) VALUES ('GROUP_A','운영_A'),"
                + "('GROUP_B','운영_B'),('ROLE_ADMIN','관리자')");
        jdbc.update("INSERT INTO tb_menu_info(menu_sn,menu_nm,up_menu_sn,menu_ordr,use_yn) "
                + "VALUES (1,'Root',null,1,'Y'),(2,'Child',1,2,'Y'),(3,'Unassigned',null,3,'Y')");
        jdbc.update("INSERT INTO tb_authrt_grnt_map VALUES ('GROUP_A','NAVIGATION','1'),"
                + "('GROUP_B','NAVIGATION','1'),('GROUP_B','NAVIGATION','2'),('ROLE_ADMIN','OPERATION','3')");
    }

    @Test
    void combinesAssignedGroupsWithoutDuplicatesOrOperationEscalation() {
        assertThat(repository.findAllowedMenuIds(List.of("GROUP_A", "GROUP_B"))).containsExactlyInAnyOrder(1L, 2L);
        assertThat(repository.findAllowedMenuIds(List.of("ROLE_ADMIN"))).isEmpty();
        assertThat(repository.findAllowedMenuIds(List.of())).isEmpty();
        assertThat(repository.findAllowedMenuIds(List.of("GROUP_A') OR 1=1 --"))).isEmpty();
        jdbc.update("DELETE FROM tb_authrt_grnt_map WHERE authrt_cd='GROUP_B' AND authrt_grnt_cd='2'");
        assertThat(repository.findAllowedMenuIds(List.of("GROUP_A", "GROUP_B"))).containsExactly(1L);
    }

    @Test
    void readsCompleteNavigationSelectionAndCountsOnlyNavigation() {
        var selection = repository.selectMenuCreatList("GROUP_A");
        assertThat(selection).extracting(row -> row.getMenuSn()).containsExactly(1L, 2L, 3L);
        assertThat(selection).extracting(row -> row.getRegYn()).containsExactly("Y", "N", "N");
        var page = repository.selectMenuCreatManagList("운영_", PageRequest.of(0, 1));
        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).getChkYeoBu()).isEqualTo(1L);
        assertThat(repository.selectMenuCreatManagList("%", PageRequest.of(0, 10))).isEmpty();
        assertThat(repository.selectMenuCreatManagList("관리자", PageRequest.of(0, 10))
                .getContent().get(0).getChkYeoBu()).isZero();
    }

    @Test
    void legacyUserMenuReadSupportsMultipleGroupsAndCurrentRevocation() {
        jdbc.update("INSERT INTO tb_authrt_user_map VALUES ('USER_001','GROUP_A'),('USER_001','GROUP_B')");
        assertThat(menuRepository.selectMainMenuHead("USER_001")).extracting(MenuProjection::getMenuNo).containsExactly(1L);
        assertThat(menuRepository.selectMainMenuLeft("USER_001")).extracting(MenuProjection::getMenuNo).containsExactly(1L, 2L);
        jdbc.update("DELETE FROM tb_authrt_user_map WHERE authrt_cd='GROUP_B'");
        assertThat(menuRepository.selectMainMenuLeft("USER_001")).extracting(MenuProjection::getMenuNo).containsExactly(1L);
        assertThat(menuRepository.selectMainMenuLeft("UNKNOWN")).isEmpty();
    }
}
