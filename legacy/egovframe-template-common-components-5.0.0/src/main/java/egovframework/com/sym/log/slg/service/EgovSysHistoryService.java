package egovframework.com.sym.log.slg.service;

import java.util.Map;

import org.springframework.ui.ModelMap;



/**
 * @Class Name  : EgovSysHistoryService.java
 * @Description : ?쒖뒪??泥섎━ ?대젰愿由щ? ?꾪븳 ?쒕퉬???명꽣?섏씠??
 * @Modification Information
 *
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *     -------          --------        ---------------------------
 *   2009.03.06       ?댁궪??                 理쒖큹 ?앹꽦
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 03. 06
 * @version 1.0
 * @see
 *
 */
public interface EgovSysHistoryService {

	/**
	 * ?쒖뒪???대젰?뺣낫瑜??깅줉?쒕떎.
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 * @return
	 * @throws Exception
	 */
	public Map<?, ?> insertSysHistory(SysHistory history) throws Exception;

	/**
	 * ?쒖뒪???대젰?뺣낫瑜??섏젙?쒕떎.
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 * @return
	 * @throws Exception
	 */
	public void updateSysHistory(SysHistory history) throws Exception;

	/**
	 * ?쒖뒪???대젰?뺣낫瑜???젣?쒕떎.
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 * @return
	 * @throws Exception
	 */
	public void deleteSysHistory(SysHistory history) throws Exception;

	/**
	 * ?쒖뒪???대젰?뺣낫瑜??곸꽭議고쉶?쒕떎.
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 * @return
	 * @throws Exception
	 */
	public SysHistoryVO selectSysHistory(SysHistoryVO historyVO) throws Exception;

	/**
	 * ?쒖뒪???대젰?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 * @return
	 * @throws Exception
	 */
	public void selectSysHistoryList(SysHistoryVO historyVO, ModelMap model) throws Exception;

}
