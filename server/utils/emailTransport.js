const net = require('net');
const tls = require('tls');

/**
 * Checks if SMTP environment variables are configured
 */
function isSmtpConfigured() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return Boolean(host && user && pass && host.trim() !== '' && user.trim() !== '');
}

/**
 * Sends an email with an optional PDF attachment via standard SMTP (STARTTLS / TLS)
 */
async function sendSmtpEmail({
  to,
  subject,
  htmlBody,
  textBody,
  from = process.env.SMTP_USER || 'academic.scheduling@srcb.edu.ph',
  attachments = [],
}) {
  if (!isSmtpConfigured()) {
    const err = new Error('SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured.');
    err.code = 'SMTP_NOT_CONFIGURED';
    err.statusCode = 503;
    throw err;
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Build MIME message with attachment
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const headers = [
    `From: "SRCB Class Scheduling System" <${from}>`,
    `To: <${to}>`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    `Date: ${new Date().toUTCString()}`,
    '',
  ];

  const bodyParts = [
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody || textBody,
    '',
  ];

  for (const att of attachments) {
    const filename = att.filename || 'Faculty_Schedule.pdf';
    const contentType = att.contentType || 'application/pdf';
    const base64Content = Buffer.isBuffer(att.content)
      ? att.content.toString('base64')
      : Buffer.from(att.content).toString('base64');

    bodyParts.push(
      `--${boundary}`,
      `Content-Type: ${contentType}; name="${filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${filename}"`,
      '',
      base64Content.match(/.{1,76}/g)?.join('\r\n') || base64Content,
      ''
    );
  }

  bodyParts.push(`--${boundary}--`, '');

  const rawMimeMessage = headers.join('\r\n') + bodyParts.join('\r\n');

  // Socket communication with SMTP Server
  return new Promise((resolve, reject) => {
    let socket = null;
    let stage = 0;
    let isSecure = port === 465;

    function cleanup() {
      if (socket) {
        try {
          socket.end();
          socket.destroy();
        } catch {}
      }
    }

    const timer = setTimeout(() => {
      cleanup();
      const err = new Error('SMTP connection timed out after 10000ms');
      err.code = 'SMTP_TIMEOUT';
      reject(err);
    }, 10000);

    function handleResponse(data) {
      const response = data.toString();
      const code = parseInt(response.substring(0, 3), 10);

      if (code >= 400) {
        clearTimeout(timer);
        cleanup();
        const err = new Error(`SMTP Error ${code}: ${response.trim()}`);
        err.code = 'SMTP_TRANSACTION_FAILED';
        return reject(err);
      }

      if (stage === 0 && code === 220) {
        stage = 1;
        socket.write(`EHLO ${host}\r\n`);
      } else if (stage === 1 && code === 250) {
        if (!isSecure && response.includes('STARTTLS')) {
          stage = 2;
          socket.write('STARTTLS\r\n');
        } else {
          stage = 3;
          socket.write('AUTH LOGIN\r\n');
        }
      } else if (stage === 2 && code === 220) {
        // Upgrade to TLS
        const tlsSocket = tls.connect({ socket, host, rejectUnauthorized: false }, () => {
          socket = tlsSocket;
          tlsSocket.on('data', handleResponse);
          stage = 1;
          tlsSocket.write(`EHLO ${host}\r\n`);
        });
        tlsSocket.on('error', (err) => {
          clearTimeout(timer);
          cleanup();
          reject(err);
        });
      } else if (stage === 3 && code === 334) {
        stage = 4;
        socket.write(Buffer.from(user).toString('base64') + '\r\n');
      } else if (stage === 4 && code === 334) {
        stage = 5;
        socket.write(Buffer.from(pass).toString('base64') + '\r\n');
      } else if (stage === 5 && code === 235) {
        stage = 6;
        socket.write(`MAIL FROM:<${from}>\r\n`);
      } else if (stage === 6 && code === 250) {
        stage = 7;
        socket.write(`RCPT TO:<${to}>\r\n`);
      } else if (stage === 7 && code === 250) {
        stage = 8;
        socket.write('DATA\r\n');
      } else if (stage === 8 && code === 354) {
        stage = 9;
        socket.write(rawMimeMessage + '\r\n.\r\n');
      } else if (stage === 9 && code === 250) {
        clearTimeout(timer);
        socket.write('QUIT\r\n');
        cleanup();
        resolve({
          success: true,
          messageId: `<${Date.now()}@${host}>`,
          recipient: to,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (isSecure) {
      socket = tls.connect(port, host, { rejectUnauthorized: false }, () => {
        socket.on('data', handleResponse);
      });
    } else {
      socket = net.connect(port, host, () => {
        socket.on('data', handleResponse);
      });
    }

    socket.on('error', (err) => {
      clearTimeout(timer);
      cleanup();
      reject(err);
    });
  });
}

module.exports = {
  isSmtpConfigured,
  sendSmtpEmail,
};
