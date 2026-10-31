package nuri.api.schema;

import nuri.business.domain.code.CommonCodeCategoryRepository;
import nuri.business.domain.code.CommonCodeChangeRepository;
import nuri.business.domain.code.CommonCodeGroupRepository;
import nuri.business.domain.code.CommonCodeId;
import nuri.business.domain.code.CommonCodeRepository;
import nuri.business.domain.group.GroupManageRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.repository.code.AdministCodeRepository;
import nuri.business.service.code.AdministCodeService;
import nuri.business.service.code.CommonCodeService;
import nuri.business.service.code.dto.AdministCodeDto;
import nuri.business.service.code.dto.CmmnClCodeDto;
import nuri.business.service.code.dto.CmmnCodeDto;
import nuri.business.service.code.dto.CmmnDetailCodeDto;
import nuri.business.service.code.dto.CommonCodeMapper;
import nuri.business.service.group.GroupManageService;
import nuri.business.service.group.dto.GroupManageDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.AdditionalAnswers.delegatesTo;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;

/** Creation with assigned identifiers must never turn into an update after a stale absence check. */
@Tag("schema-validation")
@SpringBootTest
@org.springframework.context.annotation.Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class AssignedIdentifierCreationIntegrityIntegrationTest {
    @Autowired private GroupManageService groupService;
    @Autowired private CommonCodeService codeService;
    @Autowired private AdministCodeService administService;
    @Autowired private GroupManageRepository groupRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CommonCodeRepository detailRepository;
    @Autowired private CommonCodeCategoryRepository categoryRepository;
    @Autowired private CommonCodeGroupRepository codeGroupRepository;
    @Autowired private CommonCodeChangeRepository changeRepository;
    @Autowired private CommonCodeMapper mapper;
    @Autowired private AdministCodeRepository administRepository;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private PlatformTransactionManager transactionManager;
    private String fixtureId;

    enum Creation {
        GROUP("tb_authrt_group_info", "group_id"),
        CATEGORY("tb_com_clsf_cd", "clsf_cd"),
        CODE_GROUP("tb_com_cd", "cd_id"),
        DETAIL("tb_com_dtl_cd", "cd_id"),
        ADMINIST("tb_admdst_cd", "admdst_cd");

        final String table;
        final String key;

        Creation(String table, String key) {
            this.table = table;
            this.key = key;
        }
    }

    @BeforeEach
    void prepareIdentity() {
        fixtureId = "CI" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        var principal = CustomUserDetails.builder().userId("creation-test").esntlId("CREATION_TEST")
                .enabled(true).permissions(List.of("CODE_CREATE", "ADMCODE_CREATE", "CLASS_GRP_CREATE")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }

    @AfterEach
    void removeOwnFixtures() {
        SecurityContextHolder.clearContext();
        jdbc.update("DELETE FROM tb_com_cd_chg_hstry WHERE clsf_cd=? OR cd_id=?", fixtureId, fixtureId);
        jdbc.update("DELETE FROM tb_com_dtl_cd WHERE cd_id=?", fixtureId);
        jdbc.update("DELETE FROM tb_com_cd WHERE cd_id=?", fixtureId);
        jdbc.update("DELETE FROM tb_com_clsf_cd WHERE clsf_cd=?", fixtureId);
        jdbc.update("DELETE FROM tb_authrt_group_info WHERE group_id=?", fixtureId);
        jdbc.update("DELETE FROM tb_admdst_cd WHERE admdst_cd=?", fixtureId);
    }

    @ParameterizedTest
    @EnumSource(Creation.class)
    void duplicateAndStaleAbsenceCannotReplaceTheWinnerOrItsAudit(Creation creation) {
        if (creation == Creation.CODE_GROUP || creation == Creation.DETAIL) {
            create(Creation.CATEGORY, "parent category", false);
        }
        if (creation == Creation.DETAIL) {
            create(Creation.CODE_GROUP, "parent group", false);
        }
        create(creation, "winner", false);
        var original = snapshot(creation);
        var originalHistory = history();

        assertThatThrownBy(() -> create(creation, "duplicate", false))
                .isInstanceOf(BusinessException.class);

        // Another transaction committed after existsById returned false. Only that observation is
        // stale: the service, repository write, JPA auditing and PostgreSQL constraint remain real.
        assertThatThrownBy(() -> new TransactionTemplate(transactionManager).executeWithoutResult(
                status -> create(creation, "replacement", true)))
                .isInstanceOf(DataIntegrityViolationException.class);

        assertThat(snapshot(creation)).isEqualTo(original);
        assertThat(history()).isEqualTo(originalHistory);
    }

    private void create(Creation creation, String name, boolean staleAbsence) {
        switch (creation) {
            case GROUP -> {
                GroupManageService creator = groupService;
                if (staleAbsence) {
                    var stale = mock(GroupManageRepository.class, delegatesTo(groupRepository));
                    doReturn(false).when(stale).existsById(fixtureId);
                    creator = new GroupManageService(stale, userRepository);
                }
                creator.insertGroup(GroupManageDto.builder().groupId(fixtureId).groupNm(name)
                        .groupDc(name + " description").build());
            }
            case ADMINIST -> {
                AdministCodeService creator = administService;
                if (staleAbsence) {
                    var stale = mock(AdministCodeRepository.class, delegatesTo(administRepository));
                    doReturn(false).when(stale).existsById(fixtureId);
                    creator = new AdministCodeService(stale);
                }
                creator.createAdministCode(AdministCodeDto.builder().admdstCd(fixtureId)
                        .admdstSeCd("1").admdstZoneNm(name).upAdmdstCd("")
                        .useYn("Y").crtYmd("20261018").build(), "creation-test");
            }
            case CATEGORY -> codeCreator(creation, staleAbsence).insertCmmnClCode(
                    CmmnClCodeDto.builder().clsfCd(fixtureId).clsfCdNm(name)
                            .clsfCdExpln(name + " description").useYn("Y").build());
            case CODE_GROUP -> codeCreator(creation, staleAbsence).insertCmmnCode(
                    CmmnCodeDto.builder().cdId(fixtureId).cdIdNm(name).clsfCd(fixtureId)
                            .cdIdExpln(name + " description").useYn("Y").build());
            case DETAIL -> codeCreator(creation, staleAbsence).insertCmmnDetailCode(
                    CmmnDetailCodeDto.builder().cdId(fixtureId).dtlCd("DETAIL").dtlCdNm(name)
                            .dtlCdExpln(name + " description").useYn("Y").build());
        }
    }

    private CommonCodeService codeCreator(Creation creation, boolean staleAbsence) {
        if (!staleAbsence) return codeService;
        var categories = categoryRepository;
        var groups = codeGroupRepository;
        var details = detailRepository;
        switch (creation) {
            case CATEGORY -> {
                categories = mock(CommonCodeCategoryRepository.class, delegatesTo(categoryRepository));
                doReturn(false).when(categories).existsById(fixtureId);
            }
            case CODE_GROUP -> {
                groups = mock(CommonCodeGroupRepository.class, delegatesTo(codeGroupRepository));
                doReturn(false).when(groups).existsById(fixtureId);
            }
            case DETAIL -> {
                details = mock(CommonCodeRepository.class, delegatesTo(detailRepository));
                doReturn(false).when(details).existsById(new CommonCodeId(fixtureId, "DETAIL"));
            }
            default -> throw new IllegalArgumentException("Not a common code: " + creation);
        }
        return new CommonCodeService(details, categories, groups, mapper, changeRepository,
                new nuri.business.service.code.CommonCodeUsageCatalog(List.of()));
    }

    private Map<String, Object> snapshot(Creation creation) {
        return jdbc.queryForMap("SELECT * FROM " + creation.table + " WHERE " + creation.key + "=?", fixtureId);
    }

    private List<Map<String, Object>> history() {
        return jdbc.queryForList("SELECT * FROM tb_com_cd_chg_hstry WHERE clsf_cd=? OR cd_id=? "
                + "ORDER BY com_cd_chg_hstry_sn", fixtureId, fixtureId);
    }
}
