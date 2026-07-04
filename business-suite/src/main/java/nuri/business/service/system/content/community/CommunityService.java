package nuri.business.service.system.content.community;

import nuri.business.service.system.content.community.dto.CommunityDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface CommunityService {

    Page<CommunityDto> getCommunityList(String searchCnd, String searchWrd,
            @org.springframework.lang.NonNull Pageable pageable);

    // 관리자 전용: use_yn 무관하게 전체 커뮤니티를 조회한다(getCommunityList 는 활성만 조회).
    Page<CommunityDto> getCommunityListForAdmin(String searchCnd, String searchWrd,
            @org.springframework.lang.NonNull Pageable pageable);

    CommunityDto getCommunity(String cmmntyId);

    CommunityDto createCommunity(String userId, CommunityDto dto);

    void updateCommunity(String userId, CommunityDto dto);

    void deleteCommunity(String cmmntyId, String userId);

    List<CommunityDto> getCommunityListPortlet();
    
    void joinCommunity(String cmmntyId, String userId);
}
