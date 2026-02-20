package egovframework.com.cop.smt.sim.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.cop.smt.sim.service.IndvdlSchdulManageVO;
/**
 * ?쇱젙愿由щ? 泥섎━?섎뒗 Dao Class 援ы쁽
 * @author 怨듯넻?쒕퉬???λ룞??
 * @since 2009.04.10
 * @version 1.0
 * @see
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.04.10  ?λ룞??         理쒖큹 ?앹꽦
 *   2016.08.01  ?λ룞??         ?쒖??꾨젅?꾩썙??v3.6 媛쒖꽑
 *
 * </pre>
 */
@Repository("indvdlSchdulManageDao")
public class IndvdlSchdulManageDao extends EgovComAbstractDAO {


    /**
	 * 硫붿씤?섏씠吏/?쇱젙愿由ъ“??紐⑸줉??Map(map)?뺤떇?쇰줈 議고쉶?쒕떎.
	 * @param Map(map) - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectIndvdlSchdulManageMainList(Map<String, String> map) throws Exception{
		 return selectList("IndvdlSchdulManage.selectIndvdlSchdulManageMainList", map);
	}

    /**
	 * ?쇱젙 紐⑸줉??Map(map)?뺤떇?쇰줈 議고쉶?쒕떎.
	 * @param Map(map) - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectIndvdlSchdulManageRetrieve(Map<String, String> map) throws Exception{
		 return selectList("IndvdlSchdulManage.selectIndvdlSchdulManageRetrieve", map);
	}


    /**
	 * ?쇱젙 紐⑸줉??VO(model)?뺤떇?쇰줈 議고쉶?쒕떎.
	 * @param indvdlSchdulManageVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return IndvdlSchdulManageVO
	 * @throws Exception
	 */
	public IndvdlSchdulManageVO selectIndvdlSchdulManageDetailVO(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception{
		return (IndvdlSchdulManageVO)selectOne("IndvdlSchdulManage.selectIndvdlSchdulManageDetailVO", indvdlSchdulManageVO);
	}

    /**
	 * ?쇱젙 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<IndvdlSchdulManageVO> selectIndvdlSchdulManageList(ComDefaultVO searchVO) throws Exception{
		return selectList("IndvdlSchdulManage.selectIndvdlSchdulManage", searchVO);
	}

    /**
	 * ?쇱젙瑜??? ?곸꽭議고쉶 ?쒕떎.
	 * @param indvdlSchdulManageVO - ?쇱젙 ?뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<IndvdlSchdulManageVO> selectIndvdlSchdulManageDetail(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception{
		return selectList("IndvdlSchdulManage.selectIndvdlSchdulManageDetail", indvdlSchdulManageVO);
	}

    /**
	 * ?쇱젙瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectIndvdlSchdulManageListCnt(ComDefaultVO searchVO) throws Exception{
		return (Integer)selectOne("IndvdlSchdulManage.selectIndvdlSchdulManageCnt", searchVO);
	}

    /**
	 * ?쇱젙瑜??? ?깅줉?쒕떎.
	 * @param qindvdlSchdulManageVO - ?쇱젙 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void insertIndvdlSchdulManage(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception{
		insert("IndvdlSchdulManage.insertIndvdlSchdulManage", indvdlSchdulManageVO);
	}

    /**
	 * ?쇱젙瑜??? ?섏젙?쒕떎.
	 * @param indvdlSchdulManageVO - ?쇱젙 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void updateIndvdlSchdulManage(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception{
		insert("IndvdlSchdulManage.updateIndvdlSchdulManage", indvdlSchdulManageVO);
	}

    /**
	 * ?쇱젙瑜??? ??젣?쒕떎.
	 * @param indvdlSchdulManageVO - ?쇱젙 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	public void deleteIndvdlSchdulManage(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception{
		// ?쇱? ??젣
		delete("IndvdlSchdulManage.deleteDiaryManage", indvdlSchdulManageVO);
		// ?쇱젙愿由???젣
		delete("IndvdlSchdulManage.deleteIndvdlSchdulManage", indvdlSchdulManageVO);
	}
}
