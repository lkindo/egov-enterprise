package egovframework.com.dam.spe.req.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.dam.spe.req.service.EgovRequestOfferService;
import egovframework.com.dam.spe.req.service.RequestOfferVO;
import jakarta.annotation.Resource;
/**
 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥?? 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2010.08.30
 * @version 1.0
 * @see <pre>
 * &lt;&lt; 媛쒖젙?대젰(Modification Information) &gt;&gt;
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.08.30  ?λ룞??         理쒖큹 ?앹꽦
 *
 * </pre>
 */
@Service("egovRequestOffeService")
public class EgovRequestOfferServiceImpl extends EgovAbstractServiceImpl
        implements EgovRequestOfferService {

    @Resource(name = "RequestOfferDao")
    private RequestOfferDao dao;

    /* RSS ID Generator Service */
    @Resource(name = "egovRequestOfferIdGnrService")
    private EgovIdGnrService idgenService;

    /**
     * ??젣???섏쐞 ?듬? 嫄댁닔瑜?議고쉶?쒕떎.
     * @param RequestOfferVO  議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int
     * @throws Exception
     */
    @Override
	public int selectRequestOfferDelCnt(Map<?, ?> map) throws Exception {
    	return dao.selectRequestOfferDelCnt(map);
    }

	/**
	 * ?깅줉??吏?앹쟾臾멸? 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param map  議고쉶???뺣낫媛 ?닿릿 媛앹껜
	 * @return List
	 * @throws Exception
	 */
	@Override
	public boolean selectRequestOfferSpeCheck(Map<?, ?> map) throws Exception{

		int nSpeCnt = dao.selectRequestOfferSpeCnt(map);

		boolean booleanRtn = false;

		if(nSpeCnt > 0){
			booleanRtn = true;
		}

		return booleanRtn;
	}

    /**
     * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? 紐⑸줉??議고쉶 ?쒕떎.
     * @param requestOfferVO 議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return List
     * @throws Exception
     */
    @Override
	public List<EgovMap> selectRequestOfferList(RequestOfferVO requestOfferVO) throws Exception {
    	return dao.selectRequestOfferList(requestOfferVO);
    }

    /**
     * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param searchVO  議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int
     * @throws Exception
     */
    @Override
	public int selectRequestOfferListCnt(RequestOfferVO requestOfferVO) throws Exception {
        return dao.selectRequestOfferListCnt(requestOfferVO);
    }

    /**
     * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? ?곸꽭議고쉶 ?쒕떎.
     * @param searchVO 議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return List
     * @throws Exception
     */
    @Override
	public RequestOfferVO selectRequestOfferDetail(RequestOfferVO requestOfferVO) throws Exception {
        return dao.selectRequestOfferDetail(requestOfferVO);
    }

    /**
     * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? ?깅줉?쒕떎.
     * @param requestOfferVO 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??뺣낫媛 ?닿릿 媛앹껜
     * @throws Exception
     */
    @Override
	public void insertRequestOffer(RequestOfferVO requestOfferVO)throws Exception {

    	requestOfferVO.setKnoId(idgenService.getNextStringId());

    	dao.insertRequestOffer(requestOfferVO);
    }

    /**
     * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? ?섏젙?쒕떎.
     * @param requestOfferVO 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??뺣낫媛 ?닿릿 媛앹껜
     * @throws Exception
     */
    @Override
	public void updateRequestOffer(RequestOfferVO requestOfferVO) throws Exception {
    	dao.updateRequestOffer(requestOfferVO);
    }

    /**
     * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? ??젣?쒕떎.
     * @param requestOfferVO 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??뺣낫媛 ?닿릿 媛앹껜
     * @throws Exception
     */
    @Override
	public void deleteRequestOffer(RequestOfferVO requestOfferVO) throws Exception {
    	dao.deleteRequestOffer(requestOfferVO);
    }

}
