package egovframework.com.utl.sys.dbm.service;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;

/**
 * DB?쒕퉬?ㅻえ?덊꽣留곸쓣 ?꾪븳 Check ?대옒??
 * 
 * @author 源吏꾨쭔
 * @since 2010.07.13
 * @version 1.0
 * @see
 *
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2010.07.13  源吏꾨쭔          理쒖큹 ?앹꽦
 *   2017.02.08  ?댁젙?          ?쒗걧?댁퐫??ES) - ?쒗걧?댁퐫??遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
 *   2019.12.11  ?좎슜??         KISA 蹂댁븞?쎌젏 議곗튂 (?ㅻ쪟 ?곹솴 ???遺??
 *   2025.09.12  ?대갚??         2025??而⑦듃由щ럭??PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(遺?곸젅???먯썝 ?댁젣)
 *
 *      </pre>
 */
public class DbMntrngChecker {

	private static final Logger LOGGER = LoggerFactory.getLogger(DbMntrngChecker.class);

	/**
	 * DB?쒕퉬?ㅻえ?덊꽣留곸쓣 ?섑뻾?쒕떎.
	 * 
	 * @return 紐⑤땲?곕쭅寃곌낵
	 *
	 * @param context     ?곗씠??뚯뒪 鍮덉쓣 ?산린?꾪븳 ApplicationContext
	 * @param dataSourcNm ?곗씠??뚯뒪鍮??대쫫
	 * @param ceckSql     ?섑뻾??泥댄겕SQL
	 *
	 */
	public static DbMntrngResult check(ApplicationContext context, String dataSourcNm, String ceckSql) {
		DataSource datasource = (DataSource) context.getBean(dataSourcNm);

		try (Connection conn = datasource.getConnection();
				PreparedStatement stmt = conn.prepareStatement(ceckSql);
				// 2017.02.08 ?댁젙? ?쒗걧?댁퐫??ES)-遺?곸젅???덉쇅 泥섎━[CWE-253, CWE-440, CWE-754]
				ResultSet rs = stmt.executeQuery();) {
			return new DbMntrngResult(true, null);
		} catch (SQLException e) {
			LOGGER.error("DB?쒕퉬?ㅻえ?덊꽣留??먮윭", e);
			return new DbMntrngResult(false, e);
		}
	}

}
