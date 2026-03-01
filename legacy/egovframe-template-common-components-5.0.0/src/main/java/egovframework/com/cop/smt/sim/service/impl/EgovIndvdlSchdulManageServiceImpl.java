package egovframework.com.cop.smt.sim.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cop.smt.sim.service.EgovIndvdlSchdulManageService;
import egovframework.com.cop.smt.sim.service.IndvdlSchdulManageVO;
import jakarta.annotation.Resource;
/**
 * ?쇱젙愿由щ? 泥섎━?섎뒗 ServiceImpl Class 援ы쁽
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
@Service("egovIndvdlSchdulManageService")
public class EgovIndvdlSchdulManageServiceImpl extends EgovAbstractServiceImpl implements EgovIndvdlSchdulManageService{

	//
                     private Log log = LogFactory.getLog(this.getClass());

	@Resource(name="indvdlSchdulManageDao")
	private IndvdlSchdulManageDao dao;


	@Resource(name="deptSchdulManageIdGnrService")
	private EgovIdGnrService idgenService;


    /**
	 * 硫붿씤?섏씠吏/?쇱젙愿由ъ“??
	 * @param map - 議고쉶???뺣낫媛 ?닿릿 map
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectIndvdlSchdulManageMainList(Map<String, String> map) throws Exception{
		return dao.selectIndvdlSchdulManageMainList(map);
	}

    /**
	 * ?쇱젙 紐⑸줉??Map(map)?뺤떇?쇰줈 議고쉶?쒕떎.
	 * @param Map(map) - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<EgovMap> selectIndvdlSchdulManageRetrieve(Map<String, String> map) throws Exception{
		return dao.selectIndvdlSchdulManageRetrieve(map);
	}

    /**
	 * ?쇱젙 紐⑸줉??VO(model)?뺤떇?쇰줈 議고쉶?쒕떎.
	 * @param indvdlSchdulManageVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public IndvdlSchdulManageVO selectIndvdlSchdulManageDetailVO(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception{
		return dao.selectIndvdlSchdulManageDetailVO(indvdlSchdulManageVO);
	}

    /**
	 * ?쇱젙 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<IndvdlSchdulManageVO> selectIndvdlSchdulManageList(ComDefaultVO searchVO) throws Exception{
		return dao.selectIndvdlSchdulManageList(searchVO);
	}

    /**
	 * ?쇱젙瑜??? ?곸꽭議고쉶 ?쒕떎.
	 * @param IndvdlSchdulManage - ?뚯젙?뺣낫媛 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	@Override
	public List<IndvdlSchdulManageVO> selectIndvdlSchdulManageDetail(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception{
		return dao.selectIndvdlSchdulManageDetail(indvdlSchdulManageVO);
	}

    /**
	 * ?쇱젙瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	@Override
	public int selectIndvdlSchdulManageListCnt(ComDefaultVO searchVO) throws Exception{
		return dao.selectIndvdlSchdulManageListCnt(searchVO);
	}

    /**
	 * ?쇱젙瑜??? ?깅줉?쒕떎.
	 * @param indvdlSchdulManageVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void insertIndvdlSchdulManage(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception {
		String sMakeId = idgenService.getNextStringId();
		indvdlSchdulManageVO.setSchdulId(sMakeId);

		dao.insertIndvdlSchdulManage(indvdlSchdulManageVO);
	}

    /**
	 * ?쇱젙瑜??? ?섏젙?쒕떎.
	 * @param indvdlSchdulManageVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void updateIndvdlSchdulManage(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception{
		dao.updateIndvdlSchdulManage(indvdlSchdulManageVO);
	}

    /**
	 * ?쇱젙瑜??? ??젣?쒕떎.
	 * @param indvdlSchdulManageVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @throws Exception
	 */
	@Override
	public void deleteIndvdlSchdulManage(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception{
		dao.deleteIndvdlSchdulManage(indvdlSchdulManageVO);
	}
}
