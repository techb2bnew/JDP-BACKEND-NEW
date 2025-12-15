import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const emailUser = process.env.EMAIL_USER;
    const emaiPass = process.env.EMAIL_PASS;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser || "vikasbase2brand@gmail.com", 
        pass: emaiPass || "pjphbswhlyhkdpjv", 
      },
    });

    const mailOptions = {
      from: "vikasbase2brand@gmail.com", 
      to,
      subject,
      text,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export const sendEmailWithAttachment = async ({ to, subject, text, html, attachments }) => {
  try {
    const emailUser = process.env.EMAIL_USER;
    const emaiPass = process.env.EMAIL_PASS;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: emailUser || "vikasbase2brand@gmail.com", 
        pass: emaiPass || "pjphbswhlyhkdpjv", 
      },
      connectionTimeout: 30000, // 30 seconds
      socketTimeout: 30000, // 30 seconds
      greetingTimeout: 30000, // 30 seconds
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: emailUser || "vikasbase2brand@gmail.com", 
      to,
      subject,
      text,
      html,
      attachments: attachments || []
    };

    await transporter.sendMail(mailOptions);
    console.log("Email with attachment sent successfully");
  } catch (error) {
    console.error("Error sending email with attachment:", error);
    throw error;
  }
};