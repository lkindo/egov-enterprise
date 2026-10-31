package nuri.api.schema;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import nuri.business.service.file.AttachmentReferenceResolver;
import nuri.business.service.promotion.popup.PopupService;
import nuri.business.service.promotion.popup.dto.PopupDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** NUMERIC reads and strict string requests use the real popup service and disposable PostgreSQL. */
@Tag("schema-validation")
@SpringBootTest(properties = "nuri.durable-work.enabled=false")
@Import(AuthorizationSchemaRehearsalTestConfiguration.class)
@ActiveProfiles({"test", "tc"})
class PopupInputPolicyIntegrationTest {
    @Autowired private PopupService service;
    @Autowired private AttachmentReferenceResolver attachments;
    @Autowired private JdbcTemplate jdbc;

    private String fixture;
    private String actor;
    private String actorLogin;

    @BeforeEach
    void createOnlyOwnDisposableUser() {
        fixture = "PI" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        actor = fixture + "R";
        actorLogin = fixture + "L";
        jdbc.update("""
                INSERT INTO tb_user_info(esntl_id,user_id,pswd,user_nm,user_stts_cd,lck_yn,sbscrb_ymd)
                VALUES (?,?,'test-only-unusable','popup fixture','P','N',to_char(CURRENT_DATE,'YYYYMMDD'))
                """, actor, actorLogin);
        var principal = CustomUserDetails.builder().userId(actorLogin).esntlId(actor).enabled(true).lockAt("N")
                .permissions(List.of("POPUP_CREATE", "POPUP_UPDATE", "POPUP_DELETE")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        assertThat(AopUtils.isAopProxy(service)).isTrue();
    }

    @AfterEach
    void removeOnlyOwnFixtures() {
        SecurityContextHolder.clearContext();
        // The unique synthetic login also catches an erroneously persisted rejected create.
        jdbc.update("DELETE FROM tb_popup_info WHERE frst_rgtr_id=?", actorLogin);
        jdbc.update("DELETE FROM tb_user_info WHERE esntl_id=?", actor);
    }

    @ParameterizedTest
    @CsvSource({"5000,300", "400,99", "9999999,300"})
    void outOfRangeNumericDimensionsRemainReadableButMustBeCorrectedBeforeSaving(String legacyWidth, String legacyHeight) {
        // Empty-table migration cannot retain '0100'. Exercise representable out-of-range data instead.
        Long popup = jdbc.queryForObject("""
                INSERT INTO tb_popup_info(popup_ttl_nm,popup_wdth_pstn,popup_vrtc_pstn,popup_wdth_sz,popup_vrtc_sz,
                    stopvew_setup_yn,ntce_yn,frst_rgtr_id,last_mdfr_id,crt_dt,mdfcn_dt)
                VALUES (?,'010','-5',?,?,'N','N',?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING popup_sn
                """, Long.class, fixture, new BigDecimal(legacyWidth), new BigDecimal(legacyHeight), actorLogin, actorLogin);
        Map<String, Object> before = storedPopup(popup);
        var read = service.getPopup(popup);
        assertThat(read.getPopupWdthSz()).isEqualTo(legacyWidth);
        assertThat(read.getPopupVrtcSz()).isEqualTo(legacyHeight);
        assertThat(read.getVersion()).isZero();
        assertThat(service.getPopupList(fixture, PageRequest.of(0, 10)).getContent()).singleElement().satisfies(row -> {
            assertThat(row.getPopupWdthSz()).isEqualTo(legacyWidth);
            assertThat(row.getPopupVrtcSz()).isEqualTo(legacyHeight);
        });

        read.setPopupTtlNm(fixture + " rejected edit");
        assertThatThrownBy(() -> service.updatePopup(popup, actorLogin, read)).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(storedPopup(popup)).isEqualTo(before);

        read.setPopupTtlNm(fixture + " corrected");
        read.setPopupWdthSz("100");
        read.setPopupVrtcSz("4000");
        service.updatePopup(popup, actorLogin, read);
        assertThat(storedPopup(popup)).containsEntry("popup_wdth_sz", new BigDecimal("100"))
                .containsEntry("popup_vrtc_sz", new BigDecimal("4000"))
                .containsEntry("popup_wdth_pstn", "010").containsEntry("popup_vrtc_pstn", "-5")
                .containsEntry("version", 1).containsEntry("frst_rgtr_id", actorLogin);
        assertThat(service.getPopup(popup).getPopupWdthSz()).isEqualTo("100");
        assertThat(service.getPopup(popup).getPopupVrtcSz()).isEqualTo("4000");
    }

    @ParameterizedTest
    @CsvSource({"5000,300", "400,0100"})
    void invalidDimensionsOnCreateDoNotPersistRows(String width, String height) {
        Long before = ownedPopupCount();
        var request = popupRequest();
        request.setPopupWdthSz(width);
        request.setPopupVrtcSz(height);

        assertThatThrownBy(() -> service.createPopup(actorLogin, request)).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThat(ownedPopupCount()).isEqualTo(before);
    }

    @Test
    void validStringDimensionsBindAsNumericAndReadBackAsStrings() {
        var request = popupRequest();
        request.setPopupWdthSz("100");
        request.setPopupVrtcSz("4000");

        Long popup = service.createPopup(actorLogin, request);

        assertThat(storedPopup(popup)).containsEntry("popup_wdth_sz", new BigDecimal("100"))
                .containsEntry("popup_vrtc_sz", new BigDecimal("4000")).containsEntry("version", 0)
                .containsEntry("popup_wdth_pstn", "010").containsEntry("popup_vrtc_pstn", "-5");
        var read = service.getPopup(popup);
        assertThat(read.getPopupWdthSz()).isEqualTo("100");
        assertThat(read.getPopupVrtcSz()).isEqualTo("4000");
    }

    @Test
    void nullDimensionsStayNullOnCreateAndClearExistingValuesOnUpdate() {
        Long popup = service.createPopup(actorLogin, popupRequest());
        assertThat(storedPopup(popup)).containsEntry("popup_wdth_sz", null).containsEntry("popup_vrtc_sz", null);
        assertThat(service.getPopup(popup).getPopupWdthSz()).isNull();
        assertThat(service.getPopup(popup).getPopupVrtcSz()).isNull();

        var sized = service.getPopup(popup);
        sized.setPopupWdthSz("400");
        sized.setPopupVrtcSz("300");
        service.updatePopup(popup, actorLogin, sized);
        assertThat(storedPopup(popup)).containsEntry("popup_wdth_sz", new BigDecimal("400"))
                .containsEntry("popup_vrtc_sz", new BigDecimal("300"))
                .containsEntry("version", 1);

        var cleared = service.getPopup(popup);
        cleared.setPopupWdthSz(null);
        cleared.setPopupVrtcSz(null);
        service.updatePopup(popup, actorLogin, cleared);
        assertThat(storedPopup(popup)).containsEntry("popup_wdth_sz", null).containsEntry("popup_vrtc_sz", null)
                .containsEntry("popup_wdth_pstn", "010").containsEntry("popup_vrtc_pstn", "-5").containsEntry("version", 2);
        assertThat(service.getPopup(popup).getPopupWdthSz()).isNull();
        assertThat(service.getPopup(popup).getPopupVrtcSz()).isNull();
    }

    @Test
    void attachmentGrantStaysOnTheAttachmentThePopupPointsAt() {
        insertPopup("/api/v1/files/987654321", "Y", "CURRENT_DATE - 1", "CURRENT_DATE + 1");
        insertPopup("/api/v1/files/download?fileId=987654322", "Y", "CURRENT_DATE - 1", "CURRENT_DATE + 1");

        assertThat(attachments.resolve(987654321L, null, null).sharedGrant()).as("path URL").isTrue();
        assertThat(attachments.resolve(987654322L, null, null).sharedGrant()).as("query URL").isTrue();
        assertThat(attachments.resolve(987654323L, null, null).sharedGrant()).as("other attachment").isFalse();
    }

    @Test
    void attachmentOfAnUnpublishedPopupIsNotShared() {
        insertPopup("/api/v1/files/987654331", "N", "CURRENT_DATE - 1", "CURRENT_DATE + 1");
        insertPopup("/api/v1/files/987654332", "Y", "CURRENT_DATE + 1", "CURRENT_DATE + 2");
        insertPopup("/api/v1/files/987654333", "Y", "CURRENT_DATE - 2", "CURRENT_DATE - 1");

        // POPUP_READ is a default user permission, so holding it must not open a draft.
        var reader = CustomUserDetails.builder().userId("popup-reader").esntlId("POPUP_READER").enabled(true).lockAt("N")
                .permissions(List.of("POPUP_READ")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(reader, null, reader.getAuthorities()));
        for (long draft : List.of(987654331L, 987654332L, 987654333L)) {
            var grants = attachments.resolve(draft, "popup-reader", "POPUP_READER");
            assertThat(grants.sharedGrant()).as("unpublished popup %s", draft).isFalse();
            assertThat(grants.ownerGrant()).isFalse();
        }

        assertThat(attachments.resolve(987654331L, actorLogin, actor).ownerGrant()).as("registrar").isTrue();

        var manager = CustomUserDetails.builder().userId("popup-manager").esntlId("POPUP_MANAGER").enabled(true).lockAt("N")
                .permissions(List.of("POPUP_ADMIN_READ")).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(manager, null, manager.getAuthorities()));
        assertThat(attachments.resolve(987654331L, "popup-manager", "POPUP_MANAGER").sharedGrant()).as("manager").isTrue();
    }

    @Test
    void attachmentOfAnUnreflectedBannerIsNotShared() {
        Long file = jdbc.queryForObject("INSERT INTO tb_file_master (use_yn) VALUES ('Y') RETURNING atch_file_sn", Long.class);
        jdbc.update("INSERT INTO tb_bnr_info(bnr_nm,rflt_yn,atch_file_sn,frst_rgtr_id) VALUES (?,'N',?,?)", fixture, file, actorLogin);
        try {
            var reader = CustomUserDetails.builder().userId("banner-reader").esntlId("BANNER_READER").enabled(true).lockAt("N")
                    .permissions(List.of("BANNER_READ")).build();
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(reader, null, reader.getAuthorities()));
            assertThat(attachments.resolve(file, "banner-reader", "BANNER_READER").sharedGrant()).as("draft").isFalse();

            jdbc.update("UPDATE tb_bnr_info SET rflt_yn='Y' WHERE atch_file_sn=?", file);
            assertThat(attachments.resolve(file, "banner-reader", "BANNER_READER").sharedGrant()).as("reflected").isTrue();
        } finally {
            jdbc.update("DELETE FROM tb_bnr_info WHERE atch_file_sn=?", file);
            jdbc.update("DELETE FROM tb_file_master WHERE atch_file_sn=?", file);
        }
    }

    private void insertPopup(String fileUrl, String notice, String start, String end) {
        jdbc.update("INSERT INTO tb_popup_info(popup_ttl_nm,file_url,ntce_yn,ntce_bgnde,ntce_endde,frst_rgtr_id) VALUES (?,?,?,"
                + start + "," + end + ",?)", fixture, fileUrl, notice, actorLogin);
    }

    private PopupDto popupRequest() {
        return PopupDto.builder().popupTtlNm(fixture).popupWdthPstn("010").popupVrtcPstn("-5")
                .stopvewSetupYn("N").ntceYn("N").build();
    }

    private Map<String, Object> storedPopup(Long popup) {
        return jdbc.queryForMap("SELECT * FROM tb_popup_info WHERE popup_sn=?", popup);
    }

    private Long ownedPopupCount() {
        return jdbc.queryForObject("SELECT count(*) FROM tb_popup_info WHERE frst_rgtr_id=?", Long.class, actorLogin);
    }
}
