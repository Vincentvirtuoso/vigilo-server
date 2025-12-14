import dotenv from "dotenv";
dotenv.config();

import SibApiV3Sdk from "sib-api-v3-sdk";

// Initialize Brevo API Client
const defaultClient = SibApiV3Sdk.ApiClient.instance;
defaultClient.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();

const validateConfig = () => {
  const requiredVars = {
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
    FRONTEND_URL: process.env.FRONTEND_URL,
  };

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
};

const sendEmail = async ({
  to,
  subject,
  html: htmlContent,
  text: textContent,
}) => {
  validateConfig();

  if (!to) {
    throw new Error("Recipient email ('to') is required");
  }

  if (!subject) {
    throw new Error("Email subject is required");
  }

  try {
    // Create email data object - properties must be set individually
    const emailData = new SibApiV3Sdk.SendSmtpEmail();
    emailData.sender = {
      email: process.env.BREVO_SENDER_EMAIL,
      name: process.env.BREVO_SENDER_NAME,
    };
    emailData.to = [{ email: to }];
    emailData.subject = subject;
    emailData.htmlContent = htmlContent;
    emailData.textContent = textContent;

    console.log(`📧 Sending email to: ${to}`);
    console.log(
      `📤 From: ${emailData.sender.name} <${emailData.sender.email}>`
    );

    const response = await brevoClient.sendTransacEmail(emailData);

    console.log(
      `✅ Email sent successfully! Message ID: ${response.messageId}`
    );
    return response;
  } catch (error) {
    console.error("❌ Failed to send email:");
    console.error("Error details:", error.response?.body || error.message);

    // Re-throw with more context
    throw new Error(
      `Email sending failed: ${error.response?.body?.message || error.message}`
    );
  }
};

export default sendEmail;
