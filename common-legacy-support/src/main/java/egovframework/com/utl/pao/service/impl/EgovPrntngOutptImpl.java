package egovframework.com.utl.pao.service.impl;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.system.ImgTempId;
import com.company.project.domain.system.ImgTempRepository;

import egovframework.com.utl.pao.service.EgovPrntngOutpt;
import egovframework.com.utl.pao.service.PrntngOutptVO;
import jakarta.annotation.Resource;

/**
 * ???????????????????? ??? (Modernized)
 **/
@Service("PrntngOutpt")
public class EgovPrntngOutptImpl extends EgovAbstractServiceImpl implements EgovPrntngOutpt {

    @Resource
    private ImgTempRepository imgTempRepository;

    /**
     * ????????.
     **/
    @Override
    @Transactional(readOnly = true)
    public PrntngOutptVO selectErncsl(PrntngOutptVO searchVO) throws Exception {
        ImgTempId id = new ImgTempId(searchVO.getOrgCode(), searchVO.getErncslSe());
        return imgTempRepository.findById(id).map(entity -> {
            PrntngOutptVO vo = new PrntngOutptVO();
            vo.setImgInfo(entity.getImageInfo());
            vo.setImgType(entity.getImageType());
            return vo;
        }).orElse(null);
    }

}
