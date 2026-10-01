package nuri.api.controller.business.addressbook;

import nuri.business.service.addressbook.AddressBookService;
import nuri.business.service.addressbook.dto.AddressBookDto;
import nuri.business.service.addressbook.dto.AddressBookUserDto;
import nuri.business.service.addressbook.dto.AddressBookUserSelectionDto;
import nuri.business.support.ControllerTestSupport;
import nuri.foundation.core.annotation.PrivacyAccess;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AddressBookApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AddressBookApiController 테스트")
class AddressBookApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private AddressBookService addressBookService;

    @Test
    @DisplayName("개인정보를 반환하는 상세·사용자 검색에 접근 증적을 선언")
    void sensitiveReadsDeclarePrivacyAccess() throws NoSuchMethodException {
        PrivacyAccess detail = AddressBookApiController.class
                .getDeclaredMethod("getAddressBook", Long.class)
                .getAnnotation(PrivacyAccess.class);
        PrivacyAccess userSearch = AddressBookApiController.class
                .getDeclaredMethod("searchUsers", String.class, Pageable.class)
                .getAnnotation(PrivacyAccess.class);

        assertThat(detail).isNotNull();
        assertThat(detail.value()).isNotBlank();
        assertThat(userSearch).isNotNull();
        assertThat(userSearch.value()).isNotBlank();
        assertThat(AddressBookApiController.class.getDeclaredMethod("searchUserSelections", String.class, Pageable.class)
                .getAnnotation(PrivacyAccess.class)).isNotNull();
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("주소록 목록 조회 성공")
    void getAddressBooks_Success() throws Exception {
        // Given
        Page<AddressBookDto> page = new PageImpl<>(List.of(new AddressBookDto()));
        given(addressBookService.getAddressBookList(any(), any(), any(), any(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/address-books")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list").isArray());
    }

    @Test
    @DisplayName("주소록 상세 조회 성공")
    void getAddressBook_Success() throws Exception {
        // Given
        given(addressBookService.getAddressBook(anyLong())).willReturn(new AddressBookDto());

        // When & Then
        mockMvc.perform(get("/api/v1/address-books/1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("주소록 등록 성공")
    void createAddressBook_Success() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/v1/address-books")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"adbkNm\":\"My Address Book\", \"rlsScopeCd\":\"PUBLIC\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    void updateWithoutMemberListPreservesTheOmissionAndForwardsTheEditToken() throws Exception {
        String token = "a".repeat(64);
        mockMvc.perform(put("/api/v1/address-books/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"adbkNm":"이름만 변경", "rlsScopeCd":"PUBLIC", "editToken":"%s"}
                        """.formatted(token)))
                .andExpect(status().isOk());
        var request = org.mockito.ArgumentCaptor.forClass(AddressBookDto.class);
        org.mockito.Mockito.verify(addressBookService).updateAddressBook(org.mockito.ArgumentMatchers.eq("testUser"), request.capture());
        assertThat(request.getValue().getAdbkMan()).isNull();
        assertThat(request.getValue().getEditToken()).isEqualTo(token);
        assertThat(request.getValue().getAdbkSn()).isEqualTo(1L);
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    void explicitEmptyMemberListRetainsItsClearAllMeaning() throws Exception {
        mockMvc.perform(put("/api/v1/address-books/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"adbkNm":"구성원 제거", "rlsScopeCd":"PUBLIC", "editToken":"%s", "adbkMan":[]}
                        """.formatted("a".repeat(64))))
                .andExpect(status().isOk());
        var request = org.mockito.ArgumentCaptor.forClass(AddressBookDto.class);
        org.mockito.Mockito.verify(addressBookService).updateAddressBook(org.mockito.ArgumentMatchers.eq("testUser"), request.capture());
        assertThat(request.getValue().getAdbkMan()).isNotNull().isEmpty();
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("주소록 등록은 중첩 구성원을 검증한다 — 컬럼보다 긴 이메일은 400 (DIP B5 F8)")
    void createAddressBook_RejectsInvalidNestedMember() throws Exception {
        String tooLong = "a".repeat(316) + "@x.kr"; // 321자 — 컬럼(320)보다 한 자 길다
        mockMvc.perform(post("/api/v1/address-books")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "adbkNm": "My Address Book",
                          "rlsScopeCd": "PUBLIC",
                          "adbkMan": [{"nm": "홍길동", "emlAddr": "%s"}]
                        }
                        """.formatted(tooLong))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(addressBookService);
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("[DIP B5 F8] 구성원 userId 는 서버 소유라 요청에 실어도 받지 않는다 — 비워도 400 이 아니다")
    void createAddressBook_IgnoresMemberUserId() throws Exception {
        mockMvc.perform(post("/api/v1/address-books")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "adbkNm": "My Address Book",
                          "rlsScopeCd": "PUBLIC",
                          "adbkMan": [{"userId": "AUTHOR", "nm": "홍길동"}, {"nm": "김철수"}]
                        }
                        """)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        org.mockito.ArgumentCaptor<nuri.business.service.addressbook.dto.AddressBookDto> captor =
                org.mockito.ArgumentCaptor.forClass(nuri.business.service.addressbook.dto.AddressBookDto.class);
        org.mockito.Mockito.verify(addressBookService).createAddressBook(org.mockito.ArgumentMatchers.anyString(), captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getAdbkMan())
                .extracting(nuri.business.service.addressbook.dto.AddressBookUserDto::getUserId)
                .containsOnlyNulls();
    }

    @Test
    @WithMockCustomUser(username = "testUser", esntlId = "testUser")
    @DisplayName("주소록 등록은 null 구성원을 검증 단계에서 거절한다")
    void createAddressBook_RejectsNullNestedMember() throws Exception {
        mockMvc.perform(post("/api/v1/address-books")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "adbkNm": "My Address Book",
                          "rlsScopeCd": "PUBLIC",
                          "adbkMan": [null]
                        }
                        """)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(addressBookService);
    }

    @Test
    @DisplayName("사용자 검색 성공")
    void searchUsers_Success() throws Exception {
        // Given
        Page<AddressBookUserDto> page = new PageImpl<>(List.of(AddressBookUserDto.builder()
                .userId("login-id").nm("동명이인").emlAddr("private@example.test").mblTelno("01000000000").build()));
        given(addressBookService.searchUsers(anyString(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/address-books/search-users")
                .param("searchWrd", "test")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].userId").value("login-id"))
                .andExpect(jsonPath("$.data.list[0].nm").value("동명이인"))
                .andExpect(jsonPath("$.data.list[0].emlAddr").value("private@example.test"))
                .andExpect(jsonPath("$.data.list[0].mblTelno").value("01000000000"))
                .andExpect(jsonPath("$.data.list[0].esntlId").doesNotExist());
    }

    @Test
    @DisplayName("활성 사용자 선택 계약은 내부 키·성명·부서만 반환한다")
    void userSelections_ReturnMinimalIdentity() throws Exception {
        given(addressBookService.searchUserSelections(anyString(), any(Pageable.class)))
                .willReturn(new PageImpl<>(List.of(new AddressBookUserSelectionDto("internal-key", "동명이인", "개발부"))));

        mockMvc.perform(get("/api/v1/address-books/user-selections").param("searchWrd", "동명"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].esntlId").value("internal-key"))
                .andExpect(jsonPath("$.data.list[0].userNm").value("동명이인"))
                .andExpect(jsonPath("$.data.list[0].ognzNm").value("개발부"))
                .andExpect(jsonPath("$.data.list[0].userId").doesNotExist())
                .andExpect(jsonPath("$.data.list[0].emlAddr").doesNotExist())
                .andExpect(jsonPath("$.data.list[0].mblTelno").doesNotExist());
    }
}
