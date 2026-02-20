package egovframework.com.uss.sam.stp.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;

import egovframework.com.uss.sam.stp.service.EgovStplatManageService;
import egovframework.com.uss.sam.stp.service.StplatManageDefaultVO;
import egovframework.com.uss.sam.stp.service.StplatManageVO;
import jakarta.annotation.Resource;

/**
 *
 * ?쎄??댁슜??泥섎━?섎뒗 ?쒕퉬??援ы쁽 ?대옒??
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
 *   2016.06.13  ?λ룞??         ?쒖??꾨젅?꾩썙??v3.6 媛쒖꽑
 *
 * </pre>
 */
@Service("StplatManageService")
public class EgovStplatManageServiceImpl extends EgovAbstractServiceImpl implements
        EgovStplatManageService {

    @Resource(name="StplatManageDAO")
    private StplatManageDAO stplatManageDAO;

    /** ID Generation */
	@Resource(name="egovStplatManageIdGnrService")
	private EgovIdGnrService idgenService;


    /**
	 * 湲??議고쉶?쒕떎.
	 * @param vo
	 * @return 議고쉶??湲
	 * @exception Exception
	 */
    @Override
	public StplatManageVO selectStplatDetail(StplatManageVO vo) throws Exception {
        StplatManageVO resultVO = stplatManageDAO.selectStplatDetail(vo);
        if (resultVO == null) {
			throw processException("info.nodata.msg");
		}
        return resultVO;
    }

    /**
	 * ?쎄??뺣낫 湲 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 紐⑸줉
	 * @exception Exception
	 */
    @Override
	public List<StplatManageVO> selectStplatList(StplatManageDefaultVO searchVO) throws Exception {
        return stplatManageDAO.selectStplatList(searchVO);
    }

    /**
	 * ?쎄??뺣낫 湲 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param searchVO
	 * @return 湲 珥?媛쒖닔
	 */
    @Override
	public int selectStplatListTotCnt(StplatManageDefaultVO searchVO) {
		return stplatManageDAO.selectStplatListTotCnt(searchVO);
	}

	/**
	 * ?쎄??뺣낫 湲???깅줉?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    @Override
	public void insertStplatCn(StplatManageVO vo) throws Exception {
    	egovLogger.debug(vo.toString());

		String	useStplatId = idgenService.getNextStringId();

		vo.setUseStplatId(useStplatId);

    	stplatManageDAO.insertStplatCn(vo);
    }

	/**
	 * ?쎄??뺣낫 湲???섏젙?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    @Override
	public void updateStplatCn(StplatManageVO vo) throws Exception {
    	egovLogger.debug(vo.toString());

    	stplatManageDAO.updateStplatCn(vo);
    }

	/**
	 * ?쎄??뺣낫 湲????젣?쒕떎.
	 * @param vo
	 * @exception Exception
	 */
    @Override
	public void deleteStplatCn(StplatManageVO vo) throws Exception {
    	egovLogger.debug(vo.toString());

    	stplatManageDAO.deleteStplatCn(vo);
    }

}
