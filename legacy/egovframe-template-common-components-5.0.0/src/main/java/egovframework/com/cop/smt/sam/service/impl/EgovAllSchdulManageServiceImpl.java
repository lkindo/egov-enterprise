package egovframework.com.cop.smt.sam.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cop.smt.sam.service.EgovAllSchdulManageService;
import jakarta.annotation.Resource;
/**
 * ?꾩껜?쇱젙??泥섎━?섎뒗 ServiceImpl Class 援ы쁽
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
 *
 * </pre>
 */
@Service("egovAllSchdulManageService")
public class EgovAllSchdulManageServiceImpl extends EgovAbstractServiceImpl implements EgovAllSchdulManageService{

	@Resource(name="allSchdulManageDao")
	private AllSchdulManageDao dao;

    /**
	 * ?꾩껜?쇱젙 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectAllSchdulManageeList(ComDefaultVO searchVO) throws Exception{

		return dao.selectAllSchdulManageeList(searchVO);
	}

    /**
	 * ?꾩껜?쇱젙瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	@Override
	public int selectAllSchdulManageListCnt(ComDefaultVO searchVO) throws Exception{

		return dao.selectAllSchdulManageListCnt(searchVO);
	}

}
