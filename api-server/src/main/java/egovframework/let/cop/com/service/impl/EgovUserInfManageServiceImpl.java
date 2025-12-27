package egovframework.let.cop.com.service.impl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;

import egovframework.let.cop.com.service.EgovUserInfManageService;
import egovframework.let.cop.com.service.UserInfVO;
import lombok.RequiredArgsConstructor;

/**
 * 협업에서 사용할 사용자 조회 서비스 기능 구현 클래스 (JPA 기반)
 * 
 * @author 공통서비스개발팀 이삼섭
 * @since 2009.04.06
 */
@Service("EgovUserInfManageService")
@RequiredArgsConstructor
public class EgovUserInfManageServiceImpl extends EgovAbstractServiceImpl implements EgovUserInfManageService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectClubOprtrList(UserInfVO userVO) throws Exception {
        // 동호회 운영자 목록 - 실제 동호회 기능 미구현 상태이므로 빈 목록 반환
        List<UserInfVO> result = new ArrayList<>();
        Map<String, Object> map = new HashMap<>();
        map.put("resultList", result);
        map.put("resultCnt", "0");
        return map;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectClubUserList(UserInfVO userVO) throws Exception {
        // 동호회 사용자 목록 - 실제 동호회 기능 미구현 상태이므로 빈 목록 반환
        List<UserInfVO> result = new ArrayList<>();
        Map<String, Object> map = new HashMap<>();
        map.put("resultList", result);
        map.put("resultCnt", "0");
        return map;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectCmmntyMngrList(UserInfVO userVO) throws Exception {
        // 커뮤니티 관리자 목록 - 실제 커뮤니티 기능 미구현 상태이므로 빈 목록 반환
        List<UserInfVO> result = new ArrayList<>();
        Map<String, Object> map = new HashMap<>();
        map.put("resultList", result);
        map.put("resultCnt", "0");
        return map;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectCmmntyUserList(UserInfVO userVO) throws Exception {
        // 커뮤니티 사용자 목록 - 실제 커뮤니티 기능 미구현 상태이므로 빈 목록 반환
        List<UserInfVO> result = new ArrayList<>();
        Map<String, Object> map = new HashMap<>();
        map.put("resultList", result);
        map.put("resultCnt", "0");
        return map;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectUserList(UserInfVO userVO) throws Exception {
        List<User> users = userRepository.findAll();
        List<UserInfVO> result = new ArrayList<>();

        for (User user : users) {
            UserInfVO vo = convertToVO(user);
            // 검색 조건 필터링 (간소화)
            String keyword = userVO.getSearchWrd();
            if (keyword == null || keyword.isEmpty() ||
                    (user.getUserNm() != null && user.getUserNm().contains(keyword)) ||
                    (user.getUserId() != null && user.getUserId().contains(keyword))) {
                result.add(vo);
            }
        }

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", result);
        map.put("resultCnt", Integer.toString(result.size()));
        return map;
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserInfVO> selectAllClubUser(UserInfVO userVO) throws Exception {
        // 동호회 사용자 전체 - 실제 기능 미구현
        return new ArrayList<>();
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserInfVO> selectAllCmmntyUser(UserInfVO userVO) throws Exception {
        // 커뮤니티 사용자 전체 - 실제 기능 미구현
        return new ArrayList<>();
    }

    private UserInfVO convertToVO(User user) {
        UserInfVO vo = new UserInfVO();
        vo.setUniqId(user.getEsntlId());
        vo.setUserId(user.getUserId());
        vo.setUserNm(user.getUserNm());
        vo.setUserEmail(user.getEmailAdres());
        return vo;
    }
}
