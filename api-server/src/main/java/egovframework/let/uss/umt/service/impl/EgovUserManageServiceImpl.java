package egovframework.let.uss.umt.service.impl;

import com.company.project.domain.user.Role;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import egovframework.let.uss.umt.service.EgovUserManageService;
import egovframework.let.uss.umt.service.UserDefaultVO;
import egovframework.let.uss.umt.service.UserManageVO;
import egovframework.let.utl.sim.service.EgovFileScrty;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 사용자관리에 관한 비지니스 클래스 (JPA 전환)
 */
@Service("userManageService")
@Transactional(readOnly = true)
public class EgovUserManageServiceImpl extends EgovAbstractServiceImpl implements EgovUserManageService {

    @Resource
    private UserRepository userRepository;

    @Resource(name = "egovUsrCnfrmIdGnrService")
    private EgovIdGnrService idgenService;

    @Override
    public int checkIdDplct(String checkId) {
        return userRepository.checkIdDplct(checkId);
    }

    @Override
    @Transactional
    public void deleteUser(String checkedIdForDel) {
        String[] delIdArray = checkedIdForDel.split(",");
        for (String delId : delIdArray) {
            String[] idInfo = delId.split(":");
            if (idInfo[0].equals("USR03")) {
                userRepository.deleteById(idInfo[1]);
            }
            // USR01, USR02는 현재 User 엔티티 범위 밖이므로 Staff(USR03)만 우선 처리
        }
    }

    @Override
    @Transactional
    public void insertUser(UserManageVO userManageVO) throws Exception {
        String uniqId = idgenService.getNextStringId();
        userManageVO.setUniqId(uniqId);

        // 패스워드 암호화 (기존 방식 유지 또는 PasswordEncoder 전환 검토 필요)
        // 일단 기존 EgovFileScrty 사용 (DB 호환성 위해)
        String pass = EgovFileScrty.encryptPassword(userManageVO.getPassword(), userManageVO.getEmplyrId());

        User entity = User.builder()
                .userId(userManageVO.getEmplyrId())
                .esntlId(uniqId)
                .userNm(userManageVO.getEmplyrNm())
                .password(pass)
                .passwordHint(userManageVO.getPasswordHint())
                .passwordCnsr(userManageVO.getPasswordCnsr())
                .emplNo(userManageVO.getEmplNo())
                .ihidnum(userManageVO.getIhidnum())
                .sexdstnCode(userManageVO.getSexdstnCode())
                .brth(userManageVO.getBrth())
                .areaNo(userManageVO.getAreaNo())
                .homemiddleTelno(userManageVO.getHomemiddleTelno())
                .homeendTelno(userManageVO.getHomeendTelno())
                .fxnum(userManageVO.getFxnum())
                .homeadres(userManageVO.getHomeadres())
                .detailAdres(userManageVO.getDetailAdres())
                .zip(userManageVO.getZip())
                .offmTelno(userManageVO.getOffmTelno())
                .moblphonNo(userManageVO.getMoblphonNo())
                .emailAdres(userManageVO.getEmailAdres())
                .ofcpsNm(userManageVO.getOfcpsNm())
                .groupId(userManageVO.getGroupId())
                .orgnztId(userManageVO.getOrgnztId())
                .insttCode(userManageVO.getInsttCode())
                .role(convertToRole(userManageVO.getEmplyrSttusCode()))
                .subDn(userManageVO.getSubDn())
                .build();

        userRepository.save(entity);
    }

    @Override
    public UserManageVO selectUser(String uniqId) {
        return userRepository.findByEsntlId(uniqId)
                .map(this::convertToVo)
                .orElse(null);
    }

    @Override
    public List<?> selectUserList(UserDefaultVO userSearchVO) {
        Pageable pageable = PageRequest.of(userSearchVO.getFirstIndex() / userSearchVO.getRecordCountPerPage(),
                userSearchVO.getRecordCountPerPage());
        Page<User> result = userRepository.searchUsers(userSearchVO.getSbscrbSttus(), userSearchVO.getSearchCondition(),
                userSearchVO.getSearchKeyword(), pageable);
        return result.getContent().stream().map(this::convertToVo).collect(Collectors.toList());
    }

    @Override
    public int selectUserListTotCnt(UserDefaultVO userSearchVO) {
        Pageable pageable = PageRequest.of(0, 1);
        Page<User> result = userRepository.searchUsers(userSearchVO.getSbscrbSttus(), userSearchVO.getSearchCondition(),
                userSearchVO.getSearchKeyword(), pageable);
        return (int) result.getTotalElements();
    }

    @Override
    @Transactional
    public void updateUser(UserManageVO userManageVO) throws Exception {
        userRepository.findById(userManageVO.getUniqId()) // uniqId가 userId인지 esntlId인지 확인 필요. 여기선 userId(PK)로 가정
                .ifPresent(user -> {
                    String pass = userManageVO.getPassword();
                    try {
                        pass = EgovFileScrty.encryptPassword(userManageVO.getPassword(), userManageVO.getEmplyrId());
                    } catch (Exception ignored) {
                    }

                    user.update(
                            userManageVO.getEmplyrNm(),
                            userManageVO.getPasswordHint(),
                            userManageVO.getPasswordCnsr(),
                            userManageVO.getEmplNo(),
                            userManageVO.getIhidnum(),
                            userManageVO.getSexdstnCode(),
                            userManageVO.getBrth(),
                            userManageVO.getAreaNo(),
                            userManageVO.getHomemiddleTelno(),
                            userManageVO.getHomeendTelno(),
                            userManageVO.getFxnum(),
                            userManageVO.getHomeadres(),
                            userManageVO.getDetailAdres(),
                            userManageVO.getZip(),
                            userManageVO.getOffmTelno(),
                            userManageVO.getMoblphonNo(),
                            userManageVO.getEmailAdres(),
                            userManageVO.getOfcpsNm(),
                            userManageVO.getGroupId(),
                            userManageVO.getOrgnztId(),
                            userManageVO.getInsttCode(),
                            convertToRole(userManageVO.getEmplyrSttusCode()),
                            userManageVO.getSubDn());
                    user.updatePassword(pass);
                });
    }

    @Override
    @Transactional
    public void insertUserHistory(UserManageVO userManageVO) {
        // 히스토리 기능은 추후 엔티티 또는 로깅으로 구현 검토
    }

    @Override
    @Transactional
    public void updatePassword(UserManageVO userManageVO) {
        userRepository.findById(userManageVO.getUniqId())
                .ifPresent(user -> user.updatePassword(userManageVO.getPassword()));
    }

    @Override
    public UserManageVO selectPassword(UserManageVO passVO) {
        return userRepository.findById(passVO.getUniqId())
                .map(user -> {
                    UserManageVO vo = new UserManageVO();
                    vo.setPassword(user.getPassword());
                    return vo;
                }).orElse(null);
    }

    private Role convertToRole(String sttus) {
        if (sttus == null)
            return Role.USER;
        try {
            return Role.valueOf(sttus);
        } catch (IllegalArgumentException e) {
            return Role.USER;
        }
    }

    private UserManageVO convertToVo(User user) {
        UserManageVO vo = new UserManageVO();
        vo.setUniqId(user.getEsntlId());
        vo.setEmplyrId(user.getUserId());
        vo.setEmplyrNm(user.getUserNm());
        vo.setPassword(user.getPassword());
        vo.setPasswordHint(user.getPasswordHint());
        vo.setPasswordCnsr(user.getPasswordCnsr());
        vo.setEmplNo(user.getEmplNo());
        vo.setIhidnum(user.getIhidnum());
        vo.setSexdstnCode(user.getSexdstnCode());
        vo.setBrth(user.getBrth());
        vo.setAreaNo(user.getAreaNo());
        vo.setHomemiddleTelno(user.getHomemiddleTelno());
        vo.setHomeendTelno(user.getHomeendTelno());
        vo.setFxnum(user.getFxnum());
        vo.setHomeadres(user.getHomeadres());
        vo.setDetailAdres(user.getDetailAdres());
        vo.setZip(user.getZip());
        vo.setOffmTelno(user.getOffmTelno());
        vo.setMoblphonNo(user.getMoblphonNo());
        vo.setEmailAdres(user.getEmailAdres());
        vo.setOfcpsNm(user.getOfcpsNm());
        vo.setGroupId(user.getGroupId());
        vo.setOrgnztId(user.getOrgnztId());
        vo.setInsttCode(user.getInsttCode());
        vo.setEmplyrSttusCode(user.getRole().name());
        vo.setSbscrbDe(user.getSbscrbDe().toString());
        vo.setSubDn(user.getSubDn());
        return vo;
    }
}
