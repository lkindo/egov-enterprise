package egovframework.com.sym.log.slg.service.impl;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.ui.ModelMap;

import egovframework.com.sym.log.slg.service.EgovSysHistoryService;
import egovframework.com.sym.log.slg.service.SysHistory;
import egovframework.com.sym.log.slg.service.SysHistoryVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import jakarta.annotation.Resource;

/**
 * @Class Name : EgovSysHistoryServiceImpl.java
 * @Description : ?쒖뒪???대젰愿由щ? ?꾪븳 ?쒕퉬??援ы쁽 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??      ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 9.   ?댁궪??
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 9.
 * @version
 * @see
 *
 */
@Service("EgovSysHistoryService")
public class EgovSysHistoryServiceImpl extends EgovAbstractServiceImpl implements
		EgovSysHistoryService {

	@Resource(name="sysHistoryDAO")
	private SysHistoryDAO sysHistoryDAO;

	/**
	 * ?쒖뒪???대젰?뺣낫瑜??깅줉?쒕떎.
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 * @return
	 * @throws Exception
	 */
	@Override
	public Map<?, ?> insertSysHistory(SysHistory history) throws Exception {

//		String histId = "HIST_"+20091021144553005; yyyyMMddhhmmssSSS
		String histId = "HT_"+EgovStringUtil.getTimeStamp();
		history.setHistId(histId);

		sysHistoryDAO.insertSysHistory(history);

		return null;
	}

	/**
	 * ?쒖뒪???대젰?뺣낫瑜??섏젙?쒕떎.
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 * @return
	 * @throws Exception
	 */
	@Override
	public void updateSysHistory(SysHistory history) throws Exception {

		sysHistoryDAO.updateSysHistory(history);
	}

	/**
	 * ?쒖뒪???대젰?뺣낫瑜???젣?쒕떎.
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 * @return
	 * @throws Exception
	 */
	@Override
	public void deleteSysHistory(SysHistory history) throws Exception {

		sysHistoryDAO.deleteSysHistory(history);
	}

	/**
     * ?쒖뒪???대젰?뺣낫 紐⑸줉??議고쉶?쒕떎.
     *
     * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
     * @return
     * @throws Exception
     */
    @Override
    public void selectSysHistoryList(SysHistoryVO historyVO, ModelMap model) throws Exception {
        List<SysHistoryVO> resultList = sysHistoryDAO.selectSysHistorList(historyVO);
        int totCnt = sysHistoryDAO.selectSysHistortListCnt(historyVO);
        model.addAttribute("resultList", resultList);
        model.addAttribute("resultCnt", totCnt);
    }

	/**
	 * ?쒖뒪???대젰?뺣낫瑜??곸꽭議고쉶?쒕떎.
	 * @param history - ?쒖뒪???대젰?뺣낫媛 ?닿릿 紐⑤뜽 媛앹껜
	 * @return
	 * @throws Exception
	 */
	@Override
	public SysHistoryVO selectSysHistory(SysHistoryVO historyVO) throws Exception {
		return sysHistoryDAO.selectSysHistory(historyVO);
	}

}
