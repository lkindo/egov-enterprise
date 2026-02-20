package egovframework.com.uss.olp.cns.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.uss.olp.cns.service.CnsltManageDefaultVO;
import egovframework.com.uss.olp.cns.service.CnsltManageVO;
import egovframework.com.uss.olp.cns.service.EgovCnsltManageService;
import jakarta.annotation.Resource;


/**
 *
 * ?곷떞?댁슜??泥섎━?섎뒗  援ы쁽 ?대옒??
 * @author 怨듯넻?쒕퉬??媛쒕컻? 諛뺤젙洹?
 * @since 2009.04.01
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.01  諛뺤젙洹?         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("CnsltManageService")
public class EgovCnsltManageServiceImpl extends EgovAbstractServiceImpl implements
        EgovCnsltManageService {

    @Resource(name="CnsltManageDAO")
    private CnsltManageDAO cnsltManageDAO;

    /** ID Generation */
	@Resource(name="egovCnsltManageIdGnrService")
	private EgovIdGnrService idgenService;


    /**
	 * ?곷떞?댁슜 湲??議고쉶?쒕떎.
	 * @param vo
	 * @return 議고쉶??湲
	 * @exception Exception
	 */
    @Override
	public CnsltManageVO selectCnsltListDetail(CnsltManageVO vo) throws Exception {
        CnsltManageVO resultVO = cnsltManageDAO.selectCnsltListDetail(vo);
        if (resultVO == null) {
			throw processException("info.nodata.msg");
		}
        return resultVO;
    }

	/**
	 * ?곷떞?댁슜 湲???섏젙?쒕떎.(議고쉶?섎? ?섏젙)
	 * @param vo
	 * @exception Exception
	 */
    @Override
	public void updateCnsltInqireCo(CnsltManageVO vo) throws Exception {
    	cnsltManageDAO.updateCnsltInqireCo(vo);
    }

    /**
	 * ?곷떞?댁슜 湲 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 紐⑸줉
	 * @exception Exception
	 */
    @Override
	public List<EgovMap> selectCnsltList(CnsltManageDefaultVO searchVO) throws Exception {
        return cnsltManageDAO.selectCnsltList(searchVO);
    }

    /**
	 * ?곷떞?댁슜 湲 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 珥?媛쒖닔
	 */
    @Override
	public int selectCnsltListTotCnt(CnsltManageDefaultVO searchVO) {
		return cnsltManageDAO.selectCnsltListTotCnt(searchVO);
	}

	/**
	 * ?곷떞?댁슜 湲???깅줉?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    @Override
	public void insertCnsltDtls(CnsltManageVO vo) throws Exception {
    	String	cnsltId = idgenService.getNextStringId();

		vo.setCnsltId(cnsltId);

    	cnsltManageDAO.insertCnsltDtls(vo);
    }

    /**
	 * ?묒꽦鍮꾨?踰덊샇瑜??뺤씤?쒕떎.
	 * @param vo
	 * @return 湲 珥?媛쒖닔
	 */
    @Override
	public int selectCnsltPasswordConfirmCnt(CnsltManageVO vo) {
		return cnsltManageDAO.selectCnsltPasswordConfirmCnt(vo);
	}

	/**
	 * ?곷떞?댁슜 湲???섏젙?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    @Override
	public void updateCnsltDtls(CnsltManageVO vo) throws Exception {
    	cnsltManageDAO.updateCnsltDtls(vo);
    }

	/**
	 * ?곷떞?댁슜 湲????젣?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    @Override
	public void deleteCnsltDtls(CnsltManageVO vo) throws Exception {
    	cnsltManageDAO.deleteCnsltDtls(vo);
    }


    /**
	 * ?곷떞?듬? 湲??議고쉶?쒕떎.
	 * @param vo
	 * @return 議고쉶??湲
	 * @exception Exception
	 */
    @Override
	public CnsltManageVO selectCnsltAnswerListDetail(CnsltManageVO vo) throws Exception {
        CnsltManageVO resultVO = cnsltManageDAO.selectCnsltAnswerListDetail(vo);
        if (resultVO == null) {
			throw processException("info.nodata.msg");
		}
        return resultVO;
    }

    /**
	 * ?곷떞?듬? 湲 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 紐⑸줉
	 * @exception Exception
	 */
    @Override
	public List<EgovMap> selectCnsltAnswerList(CnsltManageDefaultVO searchVO) throws Exception {
        return cnsltManageDAO.selectCnsltAnswerList(searchVO);
    }

    /**
	 * ?곷떞?듬? 湲 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 珥?媛쒖닔
	 */
    @Override
	public int selectCnsltAnswerListTotCnt(CnsltManageDefaultVO searchVO) {
		return cnsltManageDAO.selectCnsltListTotCnt(searchVO);
	}

	/**
	 * ?곷떞?듬? 湲???섏젙?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    @Override
	public void updateCnsltDtlsAnswer(CnsltManageVO vo) throws Exception {
    	cnsltManageDAO.updateCnsltDtlsAnswer(vo);
    }

}
