package egovframework.let.utl.fcc.service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;

/**
 * 숫자 연산 및 체크에 관한 숫자 유틸 클래스 (Legacy Ported)
 */
public class EgovNumberUtil {

    /**
     * 특정숫자 집합에서 랜덤 숫자를 구하는 기능 시작숫자와 종료숫자 사이에서 구한 랜덤 숫자를 반환한다
     *
     * @param startNum - 시작숫자
     * @param endNum   - 종료숫자
     * @return 랜덤숫자
     * @exception MyException
     * @see
     */
    public static int getRandomNum(int startNum, int endNum) {
        int randomNum = 0;

        try {
            // 랜덤 객체 생성
            SecureRandom rnd = new SecureRandom();

            do {
                // 종료숫자내에서 랜덤 숫자를 발생시킨다.
                randomNum = rnd.nextInt(endNum + 1);
            } while (randomNum < startNum); // 발생된 숫자가 시작숫자보다 작으면 다시 발생시킨다.

        } catch (Exception e) {
            e.printStackTrace();
        }

        return randomNum;
    }

    // Legacy had many methods, but EgovLoginServiceImpl only uses getRandomNum.
    // I am porting just this one or the whole file?
    // Usually better to port just what is needed if file is huge, OR port whole
    // file if generic.
    // The viewed file seems small enough or I will check length.
    // Step 2130 checks content.
}
