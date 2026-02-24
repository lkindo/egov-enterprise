import java.security.MessageDigest;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

public class HashCalc {
    public static void main(String[] args) throws Exception {
        String id = "webmaster";
        String password = "1";
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        md.reset();
        md.update(id.getBytes(StandardCharsets.UTF_8));
        byte[] hashValue = md.digest(password.getBytes(StandardCharsets.UTF_8));
        System.out.println("UTF-8 HASH: " + Base64.getEncoder().encodeToString(hashValue));
    }
}
