/**
 * 媛쒖슂
 * - ?먮즺?댁슜?꾪솴 ?듦퀎?????ServiceImpl瑜??뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?먮즺?댁슜?꾪솴 ?듦퀎??????깅줉, 議고쉶 湲곕뒫???쒓났?쒕떎.
 * - ?먮즺?댁슜?꾪솴 ?듦퀎??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * - 寃뚯떆?먯뿉???ㅼ슫濡쒕뱶???듦퀎留??곸슜?쒕떎.(寃뚯떆?먯씠 ?꾨땶寃쎌슦???듦퀎?먯꽌 ?쒖쇅??
 * @author lee.m.j
 * @version 1.0
 * @created 08-9-2009 ?ㅽ썑 1:40:19
 *
 * <pre>
 * << 媛쒖젙?대젰(Modification Information) >>
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2011.8.23  ?뺤쭊??		SQL Map?먯꽌 ?뺤쓽???뚮씪誘명꽣 ?대옒?ㅼ? ?ㅼ젣 ?꾨떖?섎뒗 ?대옒?ㅺ? ?щ씪??諛쒖깮?섎뒗 ?먮윭 ?섏젙
 *   						new DtaUseStats() -> new DtaUseStatsVO()
 *   2011.9.29	?닿린??	寃뚯떆?먯쇅 ?ㅼ슫濡쒕뱶???먮윭諛쒖깮(dtaUseStats 媛믪씠 null)??諛⑹?
 *
 * </pre>
 */

package egovframework.com.sts.dst.service.impl;

import java.util.List;
import java.util.Map;

import org.aspectj.lang.JoinPoint;
import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestParam;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.EgovUserDetailsHelper;
import egovframework.com.sts.dst.service.DtaUseStats;
import egovframework.com.sts.dst.service.DtaUseStatsVO;
import egovframework.com.sts.dst.service.EgovDtaUseStatsService;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

@Service("egovDtaUseStatsService")
public class EgovDtaUseStatsServiceImpl extends EgovAbstractServiceImpl implements EgovDtaUseStatsService {




	@Resource(name="dtaUseStatsDAO")
	DtaUseStatsDAO dtaUseStatsDAO;

	@Resource(name="egovDtaUseStatsIdGnrService")
    private EgovIdGnrService egovDtaUseStatsIdGnrService;

	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎?뺣낫????곷ぉ濡앹쓣 議고쉶?쒕떎.
	 * @param dtaUseStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return List - ?먮즺?댁슜?꾪솴 紐⑸줉
	 */
	@Override
	public List<DtaUseStatsVO> selectDtaUseStatsList(DtaUseStatsVO dtaUseStatsVO) throws Exception {
		return dtaUseStatsDAO.selectDtaUseStatsList(dtaUseStatsVO);
	}

	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎?뺣낫????곷ぉ濡?移댁슫?몃? 議고쉶?쒕떎.
	 * @param dtaUseStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return int
	 */
	@Override
	public int selectDtaUseStatsListTotCnt(DtaUseStatsVO dtaUseStatsVO) throws Exception {
		return dtaUseStatsDAO.selectDtaUseStatsListTotCnt(dtaUseStatsVO);
	}

	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎?뺣낫???꾩껜 移댁슫?몃? 議고쉶?쒕떎.
	 * @param dtaUseStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return int
	 */
	@Override
	public int selectDtaUseStatsListBarTotCnt(DtaUseStatsVO dtaUseStatsVO) throws Exception {
		return dtaUseStatsDAO.selectDtaUseStatsListBarTotCnt(dtaUseStatsVO);
	}

	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param dtaUseStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return reprtStatsVO - ?먮즺?댁슜?꾪솴 VO
	 */
	@Override
	public List<DtaUseStatsVO> selectDtaUseStats(DtaUseStatsVO dtaUseStatsVO) throws Exception {
		return dtaUseStatsDAO.selectDtaUseStats(dtaUseStatsVO);
	}

	/**
	 * ?먮즺?댁슜?꾪솴 ?듦퀎?뺣낫???곸꽭?뺣낫紐⑸줉 移댁슫?몃? 議고쉶?쒕떎.
	 * @param dtaUseStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return int
	 */
	@Override
	public int selectDtaUseStatsTotCnt(DtaUseStatsVO dtaUseStatsVO) throws Exception {
		return dtaUseStatsDAO.selectDtaUseStatsTotCnt(dtaUseStatsVO);
	}

	/**
	 * ?먮즺?댁슜?꾪솴 ?뺣낫瑜??앹꽦?쒕떎.
	 * @param jp - AOP??pointcut???꾪븳 JoinPoint
	 * @param dtaUseStats - ?먮즺?댁슜?꾪솴 model
	 */
    @Override
	public void insertDtaUseStats(JoinPoint jp, @RequestParam Map<String, Object> commandMap) throws Exception {

    	String atchFileId = (String)commandMap.get("atchFileId");
    	String fileSn = (String)commandMap.get("fileSn");

		LoginVO user = (LoginVO)EgovUserDetailsHelper.getAuthenticatedUser();

		DtaUseStats dtaUseStats = new DtaUseStatsVO();	//2011.08.23 ?섏젙 遺遺?
		dtaUseStats.setAtchFileId(atchFileId);
		dtaUseStats.setFileSn(fileSn);

		dtaUseStats = dtaUseStatsDAO.selectInsertDtaUseStats(dtaUseStats);

		// 2011.09.29 寃뚯떆?먯쇅 ?ㅼ슫濡쒕뱶???먮윭諛쒖깮(dtaUseStats 媛믪씠 null)??諛⑹?
		if (dtaUseStats != null) {
			DtaUseStats vo = new DtaUseStatsVO();			//2011.08.23 ?섏젙 遺遺?
			String id = user == null ? "" : EgovStringUtil.isNullToString(user.getId()); // KISA 蹂댁븞?쎌젏 議곗튂 (2018-12-11, ?좎슜??
			vo.setDtaUseStatsId(egovDtaUseStatsIdGnrService.getNextStringId());
			vo.setBbsId(dtaUseStats.getBbsId());
			vo.setNttId(dtaUseStats.getNttId());
	        vo.setAtchFileId(atchFileId);
	        vo.setFileSn(fileSn);
			vo.setUserId(id);

			dtaUseStatsDAO.insertDtaUseStats(vo);
		}
	}

	/**
	 * ?깅줉?쇱옄蹂??듦퀎?뺣낫瑜?洹몃옒?꾨줈 ?쒗쁽?쒕떎.
	 * @param dtaUseStatsVO - ?먮즺?댁슜?꾪솴 VO
	 * @return List - ?깅줉?쇱옄蹂??먮즺?댁슜?꾪솴 紐⑸줉
	 */
	@Override
	public List<DtaUseStatsVO> selectDtaUseStatsBarList(DtaUseStatsVO dtaUseStatsVO) throws Exception {
		return dtaUseStatsDAO.selectDtaUseStatsBarList(dtaUseStatsVO);
	}

}
