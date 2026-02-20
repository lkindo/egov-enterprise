package egovframework.com.dam.spe.req.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.dam.spe.req.service.RequestOfferVO;
/**
 * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥?? 泥섎━?섎뒗 Dao Class 援ы쁽
 * @author 怨듯넻肄ㅽ룷?뚰듃 ?λ룞??
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
@Repository("RequestOfferDao")
public class RequestOfferDao extends EgovComAbstractDAO {
	
	private static final Logger LOGGER = LoggerFactory.getLogger(RequestOfferDao.class);

    /**
     * ??젣???섏쐞 ?듬? 嫄댁닔瑜?議고쉶?쒕떎.
     * @param RequestOfferVO  議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int
     * @throws Exception
     */
    public int selectRequestOfferDelCnt(Map<?, ?> map) throws Exception {
    	return (Integer)selectOne("RequestOffer.selectRequestOfferDelCnt", map);
    }


    /**
     * ?깅줉??吏?앹쟾臾멸? 嫄댁닔瑜?議고쉶?쒕떎.
     * @param RequestOfferVO  議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int
     * @throws Exception
     */
    public int selectRequestOfferSpeCnt(Map<?, ?> map) throws Exception {
    	return (Integer)selectOne("RequestOffer.selectRequestOfferSpeCnt", map);
    }

    /**
     * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? 紐⑸줉???쒕떎.
     * @param requestOfferVO  議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return List
     * @throws Exception
     */
    public List<EgovMap> selectRequestOfferList(RequestOfferVO requestOfferVO) throws Exception {
    	return selectList("RequestOffer.selectRequestOffer",requestOfferVO);

    }

    /**
     * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
     * @param requestOfferVO  議고쉶???뺣낫媛 ?닿릿 媛앹껜
     * @return int
     * @throws Exception
     */
    public int selectRequestOfferListCnt(RequestOfferVO requestOfferVO) throws Exception {
    	return (Integer)selectOne("RequestOffer.selectRequestOfferCnt", requestOfferVO);
    }

    /**
     * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? ?곸꽭議고쉶 ?쒕떎.
     * @param requestOfferVO  吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??뺣낫媛 ?닿? 媛앹껜
     * @return RequestOfferVO
     * @throws Exception
     */
    public RequestOfferVO selectRequestOfferDetail(RequestOfferVO requestOfferVO) throws Exception {
    	return (RequestOfferVO)selectOne("RequestOffer.selectRequestOfferDetail", requestOfferVO);
    }

    /**
     * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? ?깅줉?쒕떎.
     * @param qindvdlInfoPolicy  吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    @SuppressWarnings("unused")
	public void insertRequestOffer(RequestOfferVO requestOfferVO) throws Exception {
    	if(requestOfferVO.getCmd().equals("save")){
    		insert("RequestOffer.insertRequestOfferSave", requestOfferVO);
    	}else if(requestOfferVO.getCmd().equals("reply")){
    		int nSeq = (Integer)selectOne("RequestOffer.selectRequestOfferReplySeq", requestOfferVO);

    		Map<?, ?> mapAnsParents = (Map<?, ?>)selectOne("RequestOffer.selectRequestOfferReplyaAnsParents", requestOfferVO);

    		//?⑤쭚?몃뱶媛 ?꾨땺???먯깋
    		if(mapAnsParents != null){
	    		Map<?, ?> mapAnsParentsSearch = null;
	    		String sAnsParents = (String)mapAnsParents.get("knoId");

	    		LOGGER.info("sAnsParents>" + sAnsParents);

	    		//?⑤쭚?몃뱶 寃??
	    		while(true){
	    			HashMap<String, String> hmParam = new HashMap<>();
	    			hmParam.put("ansParents", sAnsParents);
	    			mapAnsParents = (Map<?, ?>)selectOne("RequestOffer.selectRequestOfferReplyaAnsParentsSearch", hmParam);
	    			LOGGER.info("mapAnsParentsSearch>" + mapAnsParents);

	    			if(mapAnsParents == null){
	    				break;
	    			//1?덈꺼 ?쇰븣 泥섎━
	    			//}else if(mapAnsParents == null){
	    			}else{
	    				sAnsParents = (String)mapAnsParents.get("knoId");
	    				nSeq=(Integer)mapAnsParents.get("ansSeq") + 1;
	    			}
	    		}
    		}

    		//?⑤쭚?몃뱶媛 ?놁쑝硫?
    		if( nSeq != 1){
    			requestOfferVO.setAnsSeq(nSeq);
    		}
    		LOGGER.info("LastSeq>" + nSeq);

    		update("RequestOffer.updateRequestOfferReply", requestOfferVO);
    		insert("RequestOffer.insertRequestOfferReply", requestOfferVO);

    	}

    }

    /**
     * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? ?섏젙?쒕떎.
     * @param requestOfferVO  吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void updateRequestOffer(RequestOfferVO requestOfferVO) throws Exception {
    	 update("RequestOffer.updateRequestOffer", requestOfferVO);
    }

    /**
     * 吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??(?? ??젣?쒕떎.
     * @param requestOfferVO  吏?앹젙蹂댁젣怨?吏?앹젙蹂댁슂泥??뺣낫媛 ?닿? 媛앹껜
     * @throws Exception
     */
    public void deleteRequestOffer(RequestOfferVO requestOfferVO) throws Exception {
    	delete("RequestOffer.deleteRequestOffer", requestOfferVO);
    }

}
