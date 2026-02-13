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
 * 관인이미지에 대한 서비스 구현클래스를 정의한다 (Modernized)
 */
@Service("PrntngOutpt")
public class EgovPrntngOutptImpl extends EgovAbstractServiceImpl implements EgovPrntngOutpt {

    @Resource
    private ImgTempRepository imgTempRepository;

    /**
     * 관인이미지를 조회한다.
     */
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
