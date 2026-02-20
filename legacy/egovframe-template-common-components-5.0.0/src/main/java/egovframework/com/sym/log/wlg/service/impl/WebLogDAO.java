package egovframework.com.sym.log.wlg.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.log.wlg.service.WebLog;

/**
 * @Class Name : WebLogDAO.java
 * @Description : ?밸줈洹?愿由щ? ?꾪븳 ?곗씠???묎렐 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 11.   ?댁궪??        理쒖큹?앹꽦
 *    2011. 7. 01.   ?닿린??        ?⑦궎吏 遺꾨━(sym.log -> sym.log.wlg)
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */
@Repository("webLogDAO")
public class WebLogDAO extends EgovComAbstractDAO {

	/**
	 * ??濡쒓렇瑜?湲곕줉?쒕떎.
	 *
	 * @param WebLog
	 * @return
	 * @throws Exception
	 */
	public void logInsertWebLog(WebLog webLog) throws Exception{
		insert("WebLog.logInsertWebLog", webLog);
	}

	/**
	 * ??濡쒓렇?뺣낫瑜??붿빟?쒕떎.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 */
	public void logInsertWebLogSummary() throws Exception{
		insert("WebLog.logInsertWebLogSummary", null);
		delete("WebLog.logDeleteWebLogSummary", null);
	}

	/**
	 * ??濡쒓렇?뺣낫 ?곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param webLog
	 * @return webLog
	 * @throws Exception
	 */
	public WebLog selectWebLog(WebLog webLog) throws Exception{

		return (WebLog) selectOne("WebLog.selectWebLog", webLog);
	}

	/**
	 * ??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
	 *
	 * @param webLog
	 * @return
	 * @throws Exception
	 */
	public List<WebLog> selectWebLogInf(WebLog webLog) throws Exception{
		return selectList("WebLog.selectWebLogInf", webLog);
	}

	/**
	 * ??濡쒓렇?뺣낫 紐⑸줉???レ옄瑜?議고쉶?쒕떎.
	 * @param webLog
	 * @return
	 * @throws Exception
	 */
	public int selectWebLogInfCnt(WebLog webLog) throws Exception{

		return (Integer)selectOne("WebLog.selectWebLogInfCnt", webLog);
	}

}
