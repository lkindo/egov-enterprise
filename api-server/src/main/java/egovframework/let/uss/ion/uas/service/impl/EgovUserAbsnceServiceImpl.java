package egovframework.let.uss.ion.uas.service.impl;

import com.company.project.domain.user.User;
import com.company.project.domain.user.UserAbsenceRepository;
import com.company.project.domain.user.UserAbsenceSearchCondition;
import com.company.project.domain.user.UserAbsenceSearchResult;
import com.company.project.domain.user.UserRepository;
import egovframework.let.uss.ion.uas.service.EgovUserAbsnceService;
import egovframework.let.uss.ion.uas.service.UserAbsnce;
import egovframework.let.uss.ion.uas.service.UserAbsnceVO;
import lombok.RequiredArgsConstructor;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service("egovUserAbsnceService")
@RequiredArgsConstructor
public class EgovUserAbsnceServiceImpl extends EgovAbstractServiceImpl implements EgovUserAbsnceService {

    private final UserAbsenceRepository userAbsenceRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<UserAbsnceVO> selectUserAbsnceList(UserAbsnceVO userAbsnceVO) throws Exception {
        UserAbsenceSearchCondition condition = new UserAbsenceSearchCondition();
        condition.setSearchCondition(userAbsnceVO.getSearchCondition());
        condition.setSearchKeyword(userAbsnceVO.getSearchKeyword());
        condition.setSelAbsnceAt(userAbsnceVO.getSelAbsnceAt());

        Pageable pageable = PageRequest.of(userAbsnceVO.getPageIndex() - 1, userAbsnceVO.getPageUnit());
        Page<UserAbsenceSearchResult> page = userAbsenceRepository.search(condition, pageable);

        // userAbsnceVO.setTotalRecordCount((int) page.getTotalElements());

        return page.getContent().stream()
                .map(this::convertToVo)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public int selectUserAbsnceListTotCnt(UserAbsnceVO userAbsnceVO) throws Exception {
        UserAbsenceSearchCondition condition = new UserAbsenceSearchCondition();
        condition.setSearchCondition(userAbsnceVO.getSearchCondition());
        condition.setSearchKeyword(userAbsnceVO.getSearchKeyword());
        condition.setSelAbsnceAt(userAbsnceVO.getSelAbsnceAt());

        Pageable pageable = PageRequest.of(0, 1);
        return (int) userAbsenceRepository.search(condition, pageable).getTotalElements();
    }

    @Override
    @Transactional(readOnly = true)
    public UserAbsnceVO selectUserAbsnce(UserAbsnceVO userAbsnceVO) throws Exception {
        return getUserAbsenceVo(userAbsnceVO.getUserId());
    }

    // Interface method differs from previous generated one?
    // Check interface: insertUserAbsnce(UserAbsnce userAbsnce, UserAbsnceVO
    // userAbsnceVO)
    @Override
    @Transactional
    public UserAbsnceVO insertUserAbsnce(UserAbsnce userAbsnce, UserAbsnceVO userAbsnceVO) throws Exception {
        com.company.project.domain.user.UserAbsence entity = com.company.project.domain.user.UserAbsence.builder()
                .userId(userAbsnce.getUserId())
                .userAbsnceAt(userAbsnce.getUserAbsnceAt())
                .frstRegisterId(userAbsnce.getUserId())
                .lastUpdusrId(userAbsnce.getLastUpdusrId())
                .build();
        userAbsenceRepository.save(entity);

        return userAbsnceVO;
    }

    @Override
    @Transactional
    public void updateUserAbsnce(UserAbsnce userAbsnce) throws Exception {
        com.company.project.domain.user.UserAbsence entity = userAbsenceRepository.findById(userAbsnce.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User Absence info not found"));

        entity.update(userAbsnce.getUserAbsnceAt(), userAbsnce.getLastUpdusrId());
    }

    @Override
    @Transactional
    public void deleteUserAbsnce(UserAbsnce userAbsnce) throws Exception {
        userAbsenceRepository.deleteById(userAbsnce.getUserId());
    }

    @Override
    @Transactional(readOnly = true)
    public UserAbsnceVO selectUserAbsnceResult(UserAbsnceVO userAbsnceVO) throws Exception {
        return getUserAbsenceVo(userAbsnceVO.getUserId());
    }

    private UserAbsnceVO getUserAbsenceVo(String userId) {
        com.company.project.domain.user.UserAbsence absence = userAbsenceRepository.findById(userId).orElse(null);
        User user = userRepository.findById(userId).orElse(null);

        UserAbsnceVO vo = new UserAbsnceVO();
        vo.setUserId(userId);

        if (user != null) {
            vo.setUserNm(user.getUserNm());
        }

        if (absence != null) {
            vo.setUserAbsnceAt(absence.getUserAbsnceAt());
            vo.setRegYn("Y");
            vo.setLastUpdusrId(absence.getLastUpdusrId());
            vo.setLastUpdusrPnttm(absence.getModifiedDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
        } else {
            vo.setUserAbsnceAt("N");
            vo.setRegYn("N");
        }

        return vo;
    }

    private UserAbsnceVO convertToVo(UserAbsenceSearchResult result) {
        UserAbsnceVO vo = new UserAbsnceVO();
        vo.setUserId(result.getUserId());
        vo.setUserNm(result.getUserNm());
        vo.setUserAbsnceAt(result.getUserAbsnceAt());
        vo.setRegYn(result.getRegYn());
        vo.setLastUpdusrId(result.getLastUpdusrId());
        if (result.getLastUpdtPnttm() != null) {
            vo.setLastUpdusrPnttm(result.getLastUpdtPnttm().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
        }
        return vo;
    }
}
