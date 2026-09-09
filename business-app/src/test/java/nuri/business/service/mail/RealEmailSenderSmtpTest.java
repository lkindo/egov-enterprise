package nuri.business.service.mail;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.io.*;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.*;

/** 실제 SMTP 소켓을 사용하되 수신자는 loopback 테스트 서버로 한정한다. */
class RealEmailSenderSmtpTest {
    @Test
    void smtpAcceptsUtf8MimeMessage() throws Exception {
        try (var smtp = new SmtpFixture(false)) {
            smtp.sender().send("한글 제목", "<p>테스트 본문</p>", "sender@example.invalid", "recipient@example.invalid");
            byte[] data = smtp.received.get(5, TimeUnit.SECONDS);
            var message = new MimeMessage(Session.getInstance(new Properties()), new ByteArrayInputStream(data));
            assertThat(message.getSubject()).isEqualTo("한글 제목");
            assertThat(message.getAllRecipients()).extracting(Object::toString).containsExactly("recipient@example.invalid");
            assertThat(message.isMimeType("multipart/*")).isTrue();
            assertThat(data).isNotEmpty();
        }
    }

    @Test
    void smtpRecipientRejectionDoesNotReportSuccess() throws Exception {
        try (var smtp = new SmtpFixture(true)) {
            assertThatThrownBy(() -> smtp.sender().send("subject", "body", "sender@example.invalid", "recipient@example.invalid"))
                    .isInstanceOf(MailSendException.class);
            assertThat(smtp.received.get(5, TimeUnit.SECONDS)).isEmpty();
        }
    }

    private static final class SmtpFixture implements AutoCloseable {
        private final ServerSocket server;
        private final ExecutorService executor = Executors.newSingleThreadExecutor();
        private final Future<byte[]> received;

        SmtpFixture(boolean rejectRecipient) throws IOException {
            server = new ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"));
            server.setSoTimeout(5000);
            received = executor.submit(() -> serve(rejectRecipient));
        }

        RealEmailSender sender() {
            var sender = new JavaMailSenderImpl();
            sender.setHost("127.0.0.1");
            sender.setPort(server.getLocalPort());
            sender.getJavaMailProperties().setProperty("mail.smtp.connectiontimeout", "3000");
            sender.getJavaMailProperties().setProperty("mail.smtp.timeout", "3000");
            sender.getJavaMailProperties().setProperty("mail.smtp.writetimeout", "3000");
            return new RealEmailSender(sender);
        }

        private byte[] serve(boolean rejectRecipient) throws IOException {
            try (var socket = server.accept();
                 var reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.US_ASCII));
                 var writer = new BufferedWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.US_ASCII))) {
                socket.setSoTimeout(5000);
                reply(writer, "220 localhost test SMTP");
                var data = new StringBuilder();
                String command;
                while ((command = reader.readLine()) != null) {
                    if (command.startsWith("EHLO") || command.startsWith("HELO")) reply(writer, "250 localhost");
                    else if (command.startsWith("MAIL FROM:")) reply(writer, "250 OK");
                    else if (command.startsWith("RCPT TO:")) reply(writer, rejectRecipient ? "550 recipient rejected" : "250 OK");
                    else if (command.equals("DATA")) {
                        reply(writer, "354 End with dot");
                        String line;
                        while ((line = reader.readLine()) != null && !line.equals(".")) {
                            data.append(line.startsWith("..") ? line.substring(1) : line).append("\r\n");
                        }
                        reply(writer, "250 message accepted");
                    } else if (command.equals("QUIT")) {
                        reply(writer, "221 goodbye");
                        break;
                    } else if (command.equals("RSET")) reply(writer, "250 reset");
                    else throw new IOException("Unexpected SMTP command");
                }
                return data.toString().getBytes(StandardCharsets.US_ASCII);
            }
        }

        private static void reply(BufferedWriter writer, String response) throws IOException {
            writer.write(response + "\r\n");
            writer.flush();
        }

        @Override
        public void close() throws IOException {
            server.close();
            executor.shutdownNow();
        }
    }
}
