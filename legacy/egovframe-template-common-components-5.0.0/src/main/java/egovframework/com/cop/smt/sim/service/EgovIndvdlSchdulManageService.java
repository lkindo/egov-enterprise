package egovframework.com.cop.smt.sim.service;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.util.EgovMap;

import egovframework.com.cmm.ComDefaultVO;
/**
 * ?쇱젙愿由щ? 泥섎━?섎뒗 Service Class 援ы쁽
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
public interface EgovIndvdlSchdulManageService {


    /**
	 * 硫붿씤?섏씠吏/?쇱젙愿由ъ“??
	 * @param map - 議고쉶???뺣낫媛 ?닿릿 map
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectIndvdlSchdulManageMainList(Map<String, String> map) throws Exception;

    /**
	 * ?쇱젙 紐⑸줉??Map(map)?뺤떇?쇰줈 議고쉶?쒕떎.
	 * @param Map(map) - 議고쉶???뺣낫媛 ?닿릿 Map
	 * @return List
	 * @throws Exception
	 */
	public List<EgovMap> selectIndvdlSchdulManageRetrieve(Map<String, String> map) throws Exception;


    /**
	 * ?쇱젙 紐⑸줉??VO(model)?뺤떇?쇰줈 議고쉶?쒕떎.
	 * @param indvdlSchdulManageVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public IndvdlSchdulManageVO selectIndvdlSchdulManageDetailVO(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception;

    /**
	 * ?쇱젙 紐⑸줉??議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return List
	 * @throws Exception
	 */
	public List<IndvdlSchdulManageVO> selectIndvdlSchdulManageList(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?쇱젙瑜??? ?곸꽭議고쉶 ?쒕떎.
	 * @param indvdlSchdulManageVO - ?쇱젙 ?뺣낫 ?닿? VO
	 * @return List
	 * @throws Exception
	 */
	public List<IndvdlSchdulManageVO> selectIndvdlSchdulManageDetail(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception;

    /**
	 * ?쇱젙瑜??? 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @param searchVO - 議고쉶???뺣낫媛 ?닿릿 VO
	 * @return int
	 * @throws Exception
	 */
	public int selectIndvdlSchdulManageListCnt(ComDefaultVO searchVO) throws Exception;

    /**
	 * ?쇱젙瑜??? ?깅줉?쒕떎.
	 * @param indvdlSchdulManageVO - ?쇱젙 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  insertIndvdlSchdulManage(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception;

    /**
	 * ?쇱젙瑜??? ?섏젙?쒕떎.
	 * @param indvdlSchdulManageVO - ?쇱젙 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  updateIndvdlSchdulManage(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception;

    /**
	 * ?쇱젙瑜??? ??젣?쒕떎.
	 * @param indvdlSchdulManageVO - ?쇱젙 ?뺣낫 ?닿? VO
	 * @throws Exception
	 */
	void  deleteIndvdlSchdulManage(IndvdlSchdulManageVO indvdlSchdulManageVO) throws Exception;


}
