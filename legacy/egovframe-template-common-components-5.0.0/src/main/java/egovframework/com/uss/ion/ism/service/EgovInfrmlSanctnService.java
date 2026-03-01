package egovframework.com.uss.ion.ism.service;

import java.util.Map;

/**
 * 媛쒖슂
 * - ?쎌떇寃곗옱愿由ъ뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?쎌떇寃곗옱愿由ъ뿉 ????깅줉, ?섏젙, ??젣湲곕뒫???쒓났?쒕떎.
 * - 寃곗옱?먯뿉 ???紐⑸줉 議고쉶湲곕뒫???쒓났?쒕떎.
 * @author ?μ쿋??
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 11:29:25
 */
public interface EgovInfrmlSanctnService {

	/**
	 * 寃곗옱??紐⑸줉??議고쉶?쒕떎.
	 * @param SanctnerVO
	 * @return  Map<String, Object>
	 * 
	 * @param sanctnerVO
	 */
	public Map<String, Object> selectSanctnerList(SanctnerVO sanctnerVO) throws Exception;
	
	/**
	 * ?쎌떇寃곗옱 ?뺣낫瑜?議고쉶?쒕떎.
	 * @param InfrmlSanctn
	 * @return  InfrmlSanctn
	 * 
	 * @param infrmlSanctn
	 */
	public InfrmlSanctn selectInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception;
	
	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜??섏젙?쒕떎.
	 * @param InfrmlSanctn
	 * @return  InfrmlSanctn
	 * 
	 * @param InfrmlSanctn
	 */
	public InfrmlSanctn updateInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception;
	
	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜??뱀씤?쒕떎.
	 * @param InfrmlSanctn
	 * @return  InfrmlSanctn
	 * 
	 * @param InfrmlSanctn
	 */
	public InfrmlSanctn updateInfrmlSanctnConfm(InfrmlSanctn infrmlSanctn) throws Exception;
	
	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜?諛섎젮?쒕떎.
	 * @param InfrmlSanctn
	 * @return  InfrmlSanctn
	 * 
	 * @param InfrmlSanctn
	 */
	public InfrmlSanctn updateInfrmlSanctnReturn(InfrmlSanctn infrmlSanctn) throws Exception;

	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜??깅줉?쒕떎.
	 * @param InfrmlSanctn
	 * @return  InfrmlSanctn
	 * 
	 * @param InfrmlSanctn
	 */
	public InfrmlSanctn insertInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception;

	/**
	 * ?쎌떇寃곗옱愿由??뺣낫瑜???젣?쒕떎.
	 * @param InfrmlSanctn
	 * @return  InfrmlSanctn
	 * 
	 * @param InfrmlSanctn
	 */
	public void deleteInfrmlSanctn(InfrmlSanctn infrmlSanctn) throws Exception;

}
