package egovframework.com.uss.ion.ism.service.impl;
import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.uss.ion.ism.service.InfrmlSanctn;
import egovframework.com.uss.ion.ism.service.SanctnerVO;

/**
 * 媛쒖슂
 * - ?쎌떇寃곗옱愿由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?쎌떇寃곗옱愿由ъ뿉 ????깅줉, ?섏젙, ??젣湲곕뒫???쒓났?쒕떎.
 * - 寃곗옱?먯뿉 ???紐⑸줉議고쉶湲곕뒫???쒓났?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:29:26
 */
@Repository("InfrmlSanctnDAO")
public class InfrmlSanctnDAO extends EgovComAbstractDAO {

	
	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 寃곗옱?먮? 遺덈윭?⑤떎.
	 * @param SanctnerVO
	 * @return List
	 * 
	 * @param sanctnerVO
	 */	
	public List<SanctnerVO> selectSanctnerList(SanctnerVO sanctnerVO) throws Exception{
		return selectList("InfrmlSanctnDAO.selectSanctnerList", sanctnerVO);
	}
	
	/**
	 * 寃곗옱??紐⑸줉??????꾩껜 嫄댁닔瑜?議고쉶?쒕떎.
	 * @param SanctnerVO
	 * @return int
	 * 
	 * @param sanctnerVO
	 */
	public int selectSanctnerListCnt(SanctnerVO sanctnerVO) throws Exception{
		return (Integer)selectOne("InfrmlSanctnDAO.selectSanctnerListCnt", sanctnerVO);
	}
	
	/**
	 * 二쇱뼱吏?議곌굔??留욌뒗 ?쎌떇寃곗옱?뺣낫瑜?遺덈윭?⑤떎.
	 * @param InfrmlSanctn
	 * @return InfrmlSanctn
	 * 
	 * @param infrmlSanctn
	 */
	public InfrmlSanctn selectInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception{
		return (InfrmlSanctn)selectOne("InfrmlSanctnDAO.selectInfrmlSanctn", infrmlSanctn);
	}
	

	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜??섏젙?쒕떎.
	 * @param InfrmlSanctn
	 * 
	 * @param infrmlSanctn
	 */
	public void updateInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception{
		update("InfrmlSanctnDAO.updateInfrmlSanctn", infrmlSanctn);
	}
	
	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜??뱀씤 ?먮뒗 諛섎젮?쒕떎.
	 * @param InfrmlSanctn
	 * 
	 * @param infrmlSanctn
	 */
	public void updateInfrmlSanctnConfm(InfrmlSanctn infrmlSanctn) throws Exception{
		update("InfrmlSanctnDAO.updateInfrmlSanctnConfm", infrmlSanctn);
	}

	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜??깅줉?쒕떎.
	 * @param InfrmlSanctn
	 * 
	 * @param infrmlSanctn
	 */
	public void insertInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception{
		insert("InfrmlSanctnDAO.insertInfrmlSanctn", infrmlSanctn);
	}

	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜???젣?쒕떎.
	 * @param InfrmlSanctn
	 * 
	 * @param infrmlSanctn
	 */
	public void deleteInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception{
		delete("InfrmlSanctnDAO.deleteInfrmlSanctn", infrmlSanctn);
	}

}
