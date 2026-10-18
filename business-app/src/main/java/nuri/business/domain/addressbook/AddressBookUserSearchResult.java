package nuri.business.domain.addressbook;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.Builder;

/**
 * 주소록 활성 사용자 선택의 조회 행.
 *
 * <p>[2026-10-18] 연락처 필드(이메일·자택·휴대·사무실 전화·팩스)를 걷었다. 그 값은 퇴역한 구 검색(search-users)만 채웠고,
 * 남은 선택 조회는 연락처를 읽지 않는다 — 필드를 남기면 연락처를 다시 싣는 길이 조용히 열린다.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class AddressBookUserSearchResult {
    private String esntlId;
    private String userId;
    private String userNm;
    private String ognzNm;

}
