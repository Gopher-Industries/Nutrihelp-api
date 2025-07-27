const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_KEY);

exports.sendVerificationEmail = async (toEmail, token) => {
  const link = `${process.env.CLIENT_BASE_URL}/verify-email?token=${token}`;

  const msg = {
    to: toEmail,
    from: 'no-reply@nutrihelp.com',  // Your verified SendGrid sender
    subject: 'Email Verification - Nutrihelp',
    html: `
      <h2>Verify your email</h2>
      <p>Please click the link below to verify your email:</p>
      <a href="${link}">${link}</a>
      <p>This link will expire in 24 hours.</p>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log('Verification email sent to:', toEmail);
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw error;
  }
};
