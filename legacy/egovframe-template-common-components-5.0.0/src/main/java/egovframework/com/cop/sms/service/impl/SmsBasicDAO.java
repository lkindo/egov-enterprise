package egovframework.com.cop.sms.service.impl;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

import egovframework.com.cop.sms.service.Sms;
import egovframework.com.cop.sms.service.SmsRecptn;
import egovframework.com.cop.sms.service.SmsVO;

/**
 * 臾몄옄硫붿떆吏瑜??꾪븳 ?곗씠???묎렐 ?대옒??(?꾨젅?꾩썙??鍮꾩쥌??踰꾩쟾)
 * 
 * @author 怨듯넻而댄룷?뚰듃媛쒕컻? ?쒖꽦怨?
 * @since 2009.11.24
 * @version 1.0
 * @see
 * 
 *      <pre>
 *  == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??     ?섏젙??          ?섏젙?댁슜
 *  -------    --------    ---------------------------
 *   2009.11.24  ?쒖꽦怨?         理쒖큹 ?앹꽦
 *   2025.06.09  ?대갚??         PMD濡??뚰봽?몄썾??蹂댁븞?쎌젏 吏꾨떒?섍퀬 ?쒓굅?섍린-CloseResource(由ъ냼???リ린)
 *
 *      </pre>
 */
public class SmsBasicDAO {
	/**
	 * 臾몄옄硫붿떆吏 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param SmsVO
	 */
	public List<SmsVO> selectSmsInfs(SmsVO vo) throws Exception {
		List<SmsVO> list = new ArrayList<SmsVO>();

		StringBuffer buffer = new StringBuffer();

		// for mySql
		buffer.append("SELECT\n");
		buffer.append("  a.SMS_ID, a.TRNSMIS_TELNO, a.TRNSMIS_CN,\n");
		buffer.append("  (SELECT COUNT(*) FROM COMTNSMSRECPTN s WHERE s.SMS_ID = a.SMS_ID) as RECPTN_CNT,\n");
		buffer.append("  DATE_FORMAT(a.FRST_REGIST_PNTTM, '%Y-%m-%d %H:%i:%S') as FRST_REGIST_PNTTM\n");
		buffer.append("FROM COMTNSMS a\n");
		buffer.append("WHERE 1=1\n");

		if ("0".equals(vo.getSearchCnd())) {
			if (!"".equals(vo.getSearchWrd())) {
				buffer.append(
						"  AND a.SMS_ID in (SELECT SMS_ID FROM COMTNSMSRECPTN WHERE RECPTN_TELNO LIKE CONCAT ('%', ?,'%'))\n");
			}
		} else if ("1".equals(vo.getSearchCnd())) {
			buffer.append("  AND a.TRNSMIS_CN LIKE CONCAT ('%', #searchWrd#,'%')\n");
		}

		buffer.append("ORDER BY a.FRST_REGIST_PNTTM DESC\n");
		buffer.append("LIMIT ? OFFSET ?");

		// for Oracle
		/*
		 * buffer.append("SELECT * FROM ( SELECT rownum rn, TB.* FROM (\n");
		 * buffer.append("SELECT\n");
		 * buffer.append("  a.SMS_ID, a.TRNSMIS_TELNO, a.TRNSMIS_CN,\n"); buffer.
		 * append("  (SELECT COUNT(*) FROM COMTNSMSRECPTN s WHERE s.SMS_ID = a.SMS_ID) as RECPTN_CNT,\n"
		 * ); buffer.
		 * append("  TO_CHAR(a.FRST_REGIST_PNTTM, 'YYYY-MM-DD HH24:MI:SS') as FRST_REGIST_PNTTM\n"
		 * ); buffer.append("FROM COMTNSMS a\n"); buffer.append("WHERE 1=1\n");
		 * 
		 * if ("0".equals(vo.getSearchCnd())) { if (!"".equals(vo.getSearchWrd())) {
		 * buffer.
		 * append("  AND a.SMS_ID in (SELECT SMS_ID FROM COMTNSMSRECPTN WHERE RECPTN_TELNO LIKE '%' || ? || '%')\n"
		 * ); } } else if ("1".equals(vo.getSearchCnd())) {
		 * buffer.append("  AND a.TRNSMIS_CN LIKE '%' || ? || '%'\n"); }
		 * 
		 * buffer.append("ORDER BY a.FRST_REGIST_PNTTM DESC\n");
		 * buffer.append(") TB ) WHERE rn BETWEEN ? + 1 AND ? + ?");
		 */

		try (Connection conn = SmsBasicDBUtil.getConnection();
				PreparedStatement pstmt = conn.prepareStatement(buffer.toString());) {
			int index = 0;

			if ("0".equals(vo.getSearchCnd())) {
				if (!"".equals(vo.getSearchWrd())) {
					pstmt.setString(++index, vo.getSearchWrd());
				}
			} else if ("1".equals(vo.getSearchCnd())) {
				pstmt.setString(++index, vo.getSearchWrd());
			}

			// for mySql
			pstmt.setInt(++index, vo.getRecordCountPerPage());
			pstmt.setInt(++index, vo.getFirstIndex());

			// for Oracle
			/*
			 * pstmt.setInt(++index, vo.getFirstIndex()); pstmt.setInt(++index,
			 * vo.getFirstIndex()); pstmt.setInt(++index, vo.getRecordCountPerPage());
			 */

			try (ResultSet rs = pstmt.executeQuery();) {
				SmsVO result = null;

				while (rs.next()) {
					result = new SmsVO();

					result.setSmsId(rs.getString("SMS_ID"));
					result.setTrnsmitTelno(rs.getString("TRNSMIS_TELNO"));
					result.setTrnsmitCn(rs.getString("TRNSMIS_CN"));
					result.setRecptnCnt(rs.getInt("RECPTN_CNT"));
					result.setFrstRegisterPnttm(rs.getString("FRST_REGIST_PNTTM"));

					list.add(result);
				}
			}

			return list;
		}
	}

	/**
	 * 臾몄옄硫붿떆吏 紐⑸줉 ?レ옄瑜?議고쉶?쒕떎
	 * 
	 * @param SmsVO
	 * @return
	 * @throws Exception
	 */
	public int selectSmsInfsCnt(SmsVO vo) throws Exception {
		StringBuffer buffer = new StringBuffer();

		// for mySql
		buffer.append("SELECT\n");
		buffer.append("  COUNT(a.SMS_ID) as cnt\n");
		buffer.append("FROM COMTNSMS a\n");
		buffer.append("WHERE 1=1\n");

		if ("0".equals(vo.getSearchCnd())) {
			if (!"".equals(vo.getSearchWrd())) {
				buffer.append(
						"  AND a.SMS_ID in (SELECT SMS_ID FROM COMTNSMSRECPTN WHERE RECPTN_TELNO LIKE CONCAT ('%', ?,'%'))\n");
			}
		} else if ("1".equals(vo.getSearchCnd())) {
			buffer.append("  AND a.TRNSMIS_CN LIKE CONCAT ('%', #searchWrd#,'%')\n");
		}

		// for Oracle
		/*
		 * buffer.append("SELECT\n"); buffer.append("  COUNT(a.SMS_ID) as cnt\n");
		 * buffer.append("FROM COMTNSMS a\n"); buffer.append("WHERE 1=1\n");
		 * 
		 * if ("0".equals(vo.getSearchCnd())) { if (!"".equals(vo.getSearchWrd())) {
		 * buffer.
		 * append("  AND a.SMS_ID in (SELECT SMS_ID FROM COMTNSMSRECPTN WHERE RECPTN_TELNO LIKE '%' || ? || '%')\n"
		 * ); } } else if ("1".equals(vo.getSearchCnd())) {
		 * buffer.append("  AND a.TRNSMIS_CN LIKE '%' || ? || '%'\n"); }
		 */

		try (Connection conn = SmsBasicDBUtil.getConnection();
				PreparedStatement pstmt = conn.prepareStatement(buffer.toString());) {
			int index = 0;

			if ("0".equals(vo.getSearchCnd())) {
				if (!"".equals(vo.getSearchWrd())) {
					pstmt.setString(++index, vo.getSearchWrd());
				}
			} else if ("1".equals(vo.getSearchCnd())) {
				pstmt.setString(++index, vo.getSearchWrd());
			}

			try (ResultSet rs = pstmt.executeQuery();) {

				if (rs.next()) {
					return rs.getInt("cnt");
				}
			}

			return 0;
		}
	}

	/**
	 * 臾몄옄硫붿떆吏 ?뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param notification
	 * @return
	 * @throws Exception
	 */
	public String insertSmsInf(Sms sms) throws Exception {
		String smsId = null;

		StringBuffer buffer = new StringBuffer();

		// for mySql
		buffer.append("INSERT INTO COMTNSMS\n");
		buffer.append("  (SMS_ID, TRNSMIS_TELNO, TRNSMIS_CN,\n");
		buffer.append("   FRST_REGISTER_ID, FRST_REGIST_PNTTM )\n");
		buffer.append("VALUES\n");
		buffer.append("(?, ?, ?, ?, SYSDATE())");

		// for Oracle
		/*
		 * buffer.append("INSERT INTO COMTNSMS\n");
		 * buffer.append("  (SMS_ID, TRNSMIS_TELNO, TRNSMIS_CN,\n");
		 * buffer.append("   FRST_REGISTER_ID, FRST_REGIST_PNTTM )\n");
		 * buffer.append("VALUES\n"); buffer.append("(?, ?, ?, ?, SYSDATE)");
		 */

		try (Connection conn = SmsBasicDBUtil.getConnection();
				PreparedStatement pstmt = conn.prepareStatement(buffer.toString());) {

			conn.setAutoCommit(false);

			smsId = getNextId(conn); // SMS_ID ?앹꽦...

			int index = 0;

			pstmt.setString(++index, smsId);
			pstmt.setString(++index, sms.getTrnsmitTelno());
			pstmt.setString(++index, sms.getTrnsmitCn());
			pstmt.setString(++index, sms.getFrstRegisterId());

			pstmt.executeUpdate();

			conn.commit();

			return smsId;
		}
	}

	/**
	 * 臾몄옄硫붿떆吏 ?섏떊?뺣낫 諛?寃곌낵 ?뺣낫瑜??깅줉?쒕떎.
	 * 
	 * @param smsRecptn
	 * @throws Exception
	 */
	public void insertSmsRecptnInf(SmsRecptn smsRecptn) throws Exception {
		StringBuffer buffer = new StringBuffer();

		// for mySql & Oracle
		buffer.append("INSERT INTO COMTNSMSRECPTN\n");
		buffer.append("  (SMS_ID, RECPTN_TELNO, RESULT_CODE, RESULT_MSSAGE)\n");
		buffer.append("VALUES\n");
		buffer.append("(?, ?, ?, ?)");

		try (Connection conn = SmsBasicDBUtil.getConnection();
				PreparedStatement pstmt = conn.prepareStatement(buffer.toString());) {
			int index = 0;

			pstmt.setString(++index, smsRecptn.getSmsId());
			pstmt.setString(++index, smsRecptn.getRecptnTelno());
			pstmt.setString(++index, smsRecptn.getResultCode());
			pstmt.setString(++index, smsRecptn.getResultMssage());

			pstmt.executeUpdate();
		}
	}

	/**
	 * 臾몄옄硫붿떆吏??????곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * 
	 * @param searchVO
	 * @return
	 */
	public SmsVO selectSmsInf(SmsVO searchVO) throws Exception {
		SmsVO smsVO = new SmsVO();

		StringBuffer buffer = new StringBuffer();
		// for mySql
		buffer.append("SELECT\n");
		buffer.append("  a.SMS_ID, a.TRNSMIS_TELNO, a.TRNSMIS_CN,\n");
		buffer.append("  a.FRST_REGISTER_ID, b.USER_NM as FRST_REGISTER_NM,\n");
		buffer.append("  DATE_FORMAT(a.FRST_REGIST_PNTTM, '%Y-%m-%d') as FRST_REGIST_PNTTM\n");
		buffer.append("FROM COMTNSMS a\n");
		buffer.append("LEFT OUTER JOIN COMVNUSERMASTER b\n");
		buffer.append("  ON a.FRST_REGISTER_ID = b.ESNTL_ID\n");
		buffer.append("WHERE a.SMS_ID = ?\n");

		// for Oracle
		/*
		 * buffer.append("SELECT\n");
		 * buffer.append("  a.SMS_ID, a.TRNSMIS_TELNO, a.TRNSMIS_CN,\n");
		 * buffer.append("  a.FRST_REGISTER_ID, b.USER_NM as FRST_REGISTER_NM,\n");
		 * buffer.
		 * append("  TO_CHAR(a.FRST_REGIST_PNTTM, 'YYYY-MM-DD') as FRST_REGIST_PNTTM\n"
		 * ); buffer.append("FROM COMTNSMS a\n");
		 * buffer.append("LEFT OUTER JOIN COMVNUSERMASTER b\n");
		 * buffer.append("  ON a.FRST_REGISTER_ID = b.ESNTL_ID\n");
		 * buffer.append("WHERE a.SMS_ID = ?\n");
		 */

		try (Connection conn = SmsBasicDBUtil.getConnection();
				PreparedStatement pstmt = conn.prepareStatement(buffer.toString());) {
			int index = 0;

			pstmt.setString(++index, searchVO.getSmsId());

			try (ResultSet rs = pstmt.executeQuery();) {
				if (rs.next()) {
					smsVO.setSmsId(rs.getString("SMS_ID"));
					smsVO.setTrnsmitTelno(rs.getString("TRNSMIS_TELNO"));
					smsVO.setTrnsmitCn(rs.getString("TRNSMIS_CN"));
					smsVO.setFrstRegisterPnttm(rs.getString("FRST_REGIST_PNTTM"));
				}
			}

			return smsVO;
		}
	}

	/**
	 * 臾몄옄硫붿떆吏 ?섏떊 諛?寃곌낵 紐⑸줉??議고쉶?쒕떎.
	 * 
	 * @param SmsRecptn
	 */
	public List<SmsRecptn> selectSmsRecptnInfs(SmsRecptn vo) throws Exception {
		List<SmsRecptn> list = new ArrayList<SmsRecptn>();

		StringBuffer buffer = new StringBuffer();

		// for mySql & Oracle
		buffer.append("SELECT\n");
		buffer.append("  a.SMS_ID, a.RECPTN_TELNO, a.RESULT_CODE, a.RESULT_MSSAGE\n");
		buffer.append("FROM COMTNSMSRECPTN a\n");
		buffer.append("WHERE a.SMS_ID = ?");

		try (Connection conn = SmsBasicDBUtil.getConnection();
				PreparedStatement pstmt = conn.prepareStatement(buffer.toString());) {
			int index = 0;

			pstmt.setString(++index, vo.getSmsId());

			try (ResultSet rs = pstmt.executeQuery();) {
				SmsRecptn result = null;

				while (rs.next()) {
					result = new SmsRecptn();

					result.setSmsId(rs.getString("SMS_ID"));
					result.setRecptnTelno(rs.getString("RECPTN_TELNO"));
					result.setResultCode(rs.getString("RESULT_CODE"));
					result.setResultMssage(rs.getString("RESULT_MSSAGE"));

					list.add(result);
				}
			}

			return list;
		}
	}

	/**
	 * 臾몄옄硫붿떆吏 ?꾩넚 寃곌낵 ?섏떊??泥섎━?쒕떎. EgovSmsInfoReceiver(Schedule job)???섑빐 ?몄텧?쒕떎.
	 * 
	 * @param smsRecptn
	 * @return
	 * @throws Exception
	 */
	public void updateSmsRecptnInf(SmsRecptn smsRecptn) throws Exception {
		StringBuffer buffer = new StringBuffer();

		// for mySql & Oracle
		buffer.append("UPDATE COMTNSMSRECPTN SET\n");
		buffer.append("  RESULT_CODE = ?,\n");
		buffer.append("  RESULT_MSSAGE = ?\n");
		buffer.append("WHERE \n");
		buffer.append("  SMS_ID = ? AND RECPTN_TELNO = ?");

		try (Connection conn = SmsBasicDBUtil.getConnection();
				PreparedStatement pstmt = conn.prepareStatement(buffer.toString());) {
			int index = 0;

			pstmt.setString(++index, smsRecptn.getResultCode());
			pstmt.setString(++index, smsRecptn.getResultMssage());
			pstmt.setString(++index, smsRecptn.getSmsId());
			pstmt.setString(++index, smsRecptn.getRecptnTelno());

			pstmt.executeUpdate();
		}
	}

	/**
	 * ID 泥섎━. transaction 泥섎━瑜??꾪빐 Connection???뚮씪誘명꽣濡??섍꺼諛쏆쓬
	 * 
	 * @return
	 * @throws Exception
	 */
	protected String getNextId(Connection conn) throws Exception {
		StringBuffer buffer = new StringBuffer();

		// for mySql
		buffer.append(
				"SELECT CONCAT('SMSID_', LPAD(IFNULL(MAX(SUBSTR(SMS_ID, 7, 14)), 0) + 1, 14, '0')) as SMS_ID from COMTNSMS\n");
		buffer.append("WHERE SMS_ID LIKE 'SMSID_%'");

		// for Oracle
		/*
		 * buffer.
		 * append("SELECT CONCAT('SMSID_', LPAD(IFNULL(MAX(SUBSTR(SMS_ID, 7, 14)), 0) + 1, 14, '0')) as SMS_ID from COMTNSMS\n"
		 * ); buffer.append("WHERE SMS_ID LIKE 'SMSID_%'");
		 */

		try (PreparedStatement pstmt = conn.prepareStatement(buffer.toString());) {
			try (ResultSet rs = pstmt.executeQuery();) {
				if (rs.next()) {
					return rs.getString("SMS_ID");
				}
			}

			return null;
		}
	}
}
