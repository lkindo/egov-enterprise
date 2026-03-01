package egovframework.com.utl.sys.fsm.service.impl;
import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.utl.sys.fsm.service.FileSysMntrng;
import egovframework.com.utl.sys.fsm.service.FileSysMntrngLog;
import egovframework.com.utl.sys.fsm.service.FileSysMntrngLogVO;
import egovframework.com.utl.sys.fsm.service.FileSysMntrngVO;

/**
 * 媛쒖슂
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 *
 * ?곸꽭?댁슜
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸뿉 ????깅줉, ?섏젙, ??젣, 議고쉶湲곕뒫???쒓났?쒕떎.
 * - ?뚯씪?쒖뒪??紐⑤땲?곕쭅??곸쓽 議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:33:26
 */
@Repository("FileSysMntrngDAO")
public class FileSysMntrngDAO extends EgovComAbstractDAO {

	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 ?뚯씪?쒖뒪?쒕え?덊꽣留????紐⑸줉??遺덈윭?⑤떎.
	 * @param FileSysMntrngVO - ?뚯씪?쒖뒪?쒕え?덊꽣留????VO
	 * @return List<FileSysMntrngVO> - ?뚯씪?쒖뒪?쒕え?덊꽣留????List
	 *
	 * @param fileSysMntrngVO
	 */
	public List<FileSysMntrngVO> selectFileSysMntrngList(FileSysMntrngVO fileSysMntrngVO) throws Exception{
		return selectList("FileSysMntrngDAO.selectFileSysMntrngList", fileSysMntrngVO);
	}

	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 ?뚯씪?쒖뒪?쒕え?덊꽣留???곸쓣 遺덈윭?⑤떎.
	 * @param FileSysMntrngVO - ?뚯씪?쒖뒪?쒕え?덊꽣留????VO
	 * @return FileSysMntrngVO - ?뚯씪?쒖뒪?쒕え?덊꽣留????VO
	 *
	 * @param fileSysMntrngVO
	 */
	public FileSysMntrngVO selectFileSysMntrng(FileSysMntrngVO fileSysMntrngVO) throws Exception{
		return (FileSysMntrngVO)selectOne("FileSysMntrngDAO.selectFileSysMntrng", fileSysMntrngVO);
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅 ????뺣낫瑜??섏젙?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪?쒕え?덊꽣留????model
	 *
	 * @param fileSysMntrng
	 */
	public void updateFileSysMntrng(FileSysMntrng fileSysMntrng) throws Exception{
		update("FileSysMntrngDAO.updateFileSysMntrng", fileSysMntrng);
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅 ????뺣낫瑜??깅줉?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪?쒕え?덊꽣留????model
	 *
	 * @param fileSysMntrng
	 */
	public void insertFileSysMntrng(FileSysMntrng fileSysMntrng) throws Exception{
		insert("FileSysMntrngDAO.insertFileSysMntrng", fileSysMntrng);
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅 ????뺣낫瑜???젣?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪?쒕え?덊꽣留????model
	 *
	 * @param fileSysMntrng
	 */
	public void deleteFileSysMntrng(FileSysMntrng fileSysMntrng) throws Exception{
		delete("FileSysMntrngDAO.deleteFileSysMntrng", fileSysMntrng);
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅???紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param FileSysMntrngVO - ?뚯씪?쒖뒪?쒕え?덊꽣留????VO
	 * @return int
	 *
	 * @param fileSysMntrngVO
	 */
	public int selectFileSysMntrngListCnt(FileSysMntrngVO fileSysMntrngVO) throws Exception{
		return (Integer)selectOne("FileSysMntrngDAO.selectFileSysMntrngListCnt", fileSysMntrngVO);
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅 寃곌낵 ?뺣낫瑜??섏젙?쒕떎.
	 * @param FileSysMntrng - ?뚯씪?쒖뒪?쒕え?덊꽣留????model
	 *
	 * @param fileSysMntrng
	 */
	public void updateFileSysMntrngSttus(FileSysMntrng fileSysMntrng) throws Exception{
		update("FileSysMntrngDAO.updateFileSysMntrngSttus", fileSysMntrng);
	}

	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 ?뚯씪?쒖뒪?쒕え?덊꽣留?濡쒓렇 紐⑸줉??遺덈윭?⑤떎.
	 * @param FileSysMntrngVO - ?뚯씪?쒖뒪?쒕え?덊꽣留?濡쒓렇 VO
	 * @return List<FileSysMntrngLogVO> - ?뚯씪?쒖뒪?쒕え?덊꽣留?濡쒓렇 List
	 *
	 * @param fileSysMntrngVO
	 */
	public List<FileSysMntrngLogVO> selectFileSysMntrngLogList(FileSysMntrngLogVO fileSysMntrngLogVO) throws Exception{
		return selectList("FileSysMntrngDAO.selectFileSysMntrngLogList", fileSysMntrngLogVO);
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅濡쒓렇 紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param FileSysMntrngLogVO - ?뚯씪?쒖뒪?쒕え?덊꽣留?濡쒓렇 VO
	 * @return int
	 *
	 * @param fileSysMntrngLogVO
	 */
	public int selectFileSysMntrngLogListCnt(FileSysMntrngLogVO fileSysMntrngLogVO) throws Exception{
		return (Integer)selectOne("FileSysMntrngDAO.selectFileSysMntrngLogListCnt", fileSysMntrngLogVO);
	}

	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 ?뚯씪?쒖뒪?쒕え?덊꽣留?濡쒓렇瑜?遺덈윭?⑤떎.
	 * @param FileSysMntrngLogVO - ?뚯씪?쒖뒪?쒕え?덊꽣留?濡쒓렇 VO
	 * @return FileSysMntrngLogVO - ?뚯씪?쒖뒪?쒕え?덊꽣留?濡쒓렇 VO
	 *
	 * @param fileSysMntrngLogVO
	 */
	public FileSysMntrngLogVO selectFileSysMntrngLog(FileSysMntrngLogVO fileSysMntrngLogVO) throws Exception{
		return (FileSysMntrngLogVO)selectOne("FileSysMntrngDAO.selectFileSysMntrngLog", fileSysMntrngLogVO);
	}

	/**
	 * ?뚯씪?쒖뒪??紐⑤땲?곕쭅 ????뺣낫瑜??깅줉?쒕떎.
	 * @param FileSysMntrngLog - ?뚯씪?쒖뒪?쒕え?덊꽣留????model
	 *
	 * @param fileSysMntrngLog
	 */
	public void insertFileSysMntrngLog(FileSysMntrngLog fileSysMntrngLog) throws Exception{
		insert("FileSysMntrngDAO.insertFileSysMntrngLog", fileSysMntrngLog);
	}

}
