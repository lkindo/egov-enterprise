package egovframework.com.cop.ncm.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.namecard.NameCardRepository;
import com.company.project.domain.namecard.NameCardUserRepository;

import egovframework.com.cop.ncm.service.EgovNcrdManageService;
import egovframework.com.cop.ncm.service.NameCard;
import egovframework.com.cop.ncm.service.NameCardVO;
import jakarta.annotation.Resource;

/**
 * ??????? ????? ?????(Modernized)
 **/
@Service("EgovNcrdManageService")
public class EgovNcrdManageServiceImpl extends EgovAbstractServiceImpl implements EgovNcrdManageService {

    @Resource
    private NameCardRepository nameCardRepository;

    @Resource
    private NameCardUserRepository nameCardUserRepository;

    @Resource(name = "egovNcrdIdGnrService")
    private EgovIdGnrService idgenService;

    @Override
    @Transactional
    public void deleteNcrdItem(NameCardVO nameCardVO) throws Exception {
        com.company.project.domain.namecard.NameCardUserId id = new com.company.project.domain.namecard.NameCardUserId(
                nameCardVO.getNcrdId(), nameCardVO.getEmplyrId());
        nameCardUserRepository.deleteById(id);
        nameCardRepository.deleteById(nameCardVO.getNcrdId());
    }

    @Override
    @Transactional
    public void insertNcrdItem(NameCard nameCard) throws Exception {
        String ncrdId = idgenService.getNextStringId();
        nameCard.setNcrdId(ncrdId);

        com.company.project.domain.namecard.NameCard entity = com.company.project.domain.namecard.NameCard.builder()
                .ncrdId(ncrdId)
                .ncrdNm(nameCard.getNcrdNm())
                .cmpnyNm(nameCard.getCmpnyNm())
                .deptNm(nameCard.getDeptNm())
                .emailAdres(nameCard.getEmailAdres())
                .build();

        nameCardRepository.save(entity);

        com.company.project.domain.namecard.NameCardUser ncrdUser = com.company.project.domain.namecard.NameCardUser
                .builder()
                .ncrdId(ncrdId)
                .emplyrId(nameCard.getFrstRegisterId())
                .registSeCode("REGC04")
                .useAt("Y")
                .build();
        nameCardUserRepository.save(ncrdUser);
    }

    @Override
    @Transactional
    public void insertNcrdUseInf(egovframework.com.cop.ncm.service.NameCardUser ncrdUser) throws Exception {
        com.company.project.domain.namecard.NameCardUser entity = com.company.project.domain.namecard.NameCardUser
                .builder()
                .ncrdId(ncrdUser.getNcrdId())
                .emplyrId(ncrdUser.getEmplyrId())
                .registSeCode("REGC04")
                .useAt("Y")
                .build();
        nameCardUserRepository.save(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public NameCardVO selectNcrdItem(NameCardVO ncrdVO) throws Exception {
        return nameCardRepository.findById(ncrdVO.getNcrdId())
                .map(this::mapToVO)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectNcrdItems(NameCardVO ncrdVO) throws Exception {
        Page<com.company.project.domain.namecard.NameCard> page = nameCardRepository.findAll(
                PageRequest.of(ncrdVO.getFirstIndex() / ncrdVO.getRecordCountPerPage(),
                        ncrdVO.getRecordCountPerPage()));

        List<NameCardVO> result = page.getContent().stream().map(this::mapToVO).collect(Collectors.toList());

        Map<String, Object> map = new HashMap<>();
        map.put("resultList", result);
        map.put("resultCnt", Long.toString(page.getTotalElements()));
        return map;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectNcrdUseInfs(egovframework.com.cop.ncm.service.NameCardUser ncrdUser)
            throws Exception {
        // Implement logic using nameCardUserRepository if needed
        return new HashMap<>();
    }

    @Override
    @Transactional
    public void updateNcrdItem(NameCard nameCard) throws Exception {
        nameCardRepository.findById(nameCard.getNcrdId()).ifPresent(entity -> {
            entity.update(
                    nameCard.getNcrdNm(),
                    nameCard.getCmpnyNm(),
                    nameCard.getDeptNm(),
                    null, // clsfNm
                    null, // ofcpsNm
                    nameCard.getEmailAdres(),
                    null, // telNo
                    null, // mbtlNum
                    null, // adres
                    null, // detailAdres
                    null, // zipCode
                    null, // remark
                    null, // othbcAt
                    null // extrlUserAt
            );
        });
    }

    @Override
    @Transactional
    public void updateNcrdUseInf(egovframework.com.cop.ncm.service.NameCardUser ncrdUser) throws Exception {
        // Implement update logic
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> selectMyNcrdItems(NameCardVO ncrdVO) throws Exception {
        // Implementation needed
        return new HashMap<>();
    }

    private NameCardVO mapToVO(com.company.project.domain.namecard.NameCard entity) {
        NameCardVO vo = new NameCardVO();
        vo.setNcrdId(entity.getNcrdId());
        vo.setNcrdNm(entity.getNcrdNm());
        vo.setCmpnyNm(entity.getCmpnyNm());
        vo.setDeptNm(entity.getDeptNm());
        vo.setEmailAdres(entity.getEmailAdres());
        return vo;
    }

}
