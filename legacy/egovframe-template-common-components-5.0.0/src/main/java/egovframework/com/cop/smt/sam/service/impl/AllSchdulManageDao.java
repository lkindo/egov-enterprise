package egovframework.com.cop.smt.sam.service.impl;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Repository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
/**
 * ?꾩껜?쇱젙??泥섎━?섎뒗 Dao Class 援ы쁽
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
 *   2009.04.10  ?λ룞??        理쒖큹 ?앹꽦
 *   2016.08.01  ?λ룞??        ?쒖??꾨젅?꾩썙??v3.6 媛쒖꽑
 *
 * </pre>
 */
@Repository("allSchdulManageDao")
public class AllSchdulManageDao extends EgovComAbstractDAO {
	
    /**
	 * ?꾩껜?쇱젙 紐⑸줉??議고쉶?쒕떎. 
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectAllSchdulManageeList(ComDefaultVO searchVO) throws Exception{
		return selectList("AllSchdulManage.selectIndvdlSchdulManage", searchVO);
	}
	

    /**
	 * ?꾩껜?쇱젙瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectAllSchdulManageListCnt(ComDefaultVO searchVO) throws Exception{
		return (Integer)selectOne("AllSchdulManage.selectIndvdlSchdulManageCnt", searchVO);
	}
}
